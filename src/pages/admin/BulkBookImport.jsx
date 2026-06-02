import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Image as ImageIcon, PackageSearch, UploadCloud } from 'lucide-react';
import { CATEGORY_NAME_TO_ID } from '@/lib/categories';

const REQUIRED_COLUMNS = ['SKU', 'BookName', 'Price'];
const BULK_COLUMNS = [
  'SKU', 'Barcode', 'BookName', 'SubCategory', 'Author', 'Rabbi', 'Publisher', 'Description',
  'LongDescription', 'Price', 'SalePrice', 'StockQuantity', 'Weight', 'Language', 'ImageFileName',
  'Featured', 'Recommended', 'New', 'Active', 'AdditionalCategories',
];
const IMPORT_ACTIONS = {
  create: 'Create New',
  update: 'Update Existing',
  upsert: 'Create + Update',
  skip: 'Skip Existing',
};
const IMPORT_TEMPLATE_URL = '/templates/otzar_hakodesh_books_import_template.xlsx';

const truthy = (value) => ['true', '1', 'yes', 'y', 'כן', 'פעיל', 'חדש', 'מומלץ'].includes(String(value ?? '').trim().toLowerCase());
const falsey = (value) => ['false', '0', 'no', 'n', 'לא', 'לא פעיל', 'כבוי'].includes(String(value ?? '').trim().toLowerCase());
const numberValue = (value) => Number(String(value ?? '').replace(/[^\d.-]/g, '')) || 0;
const clean = (value) => String(value ?? '').trim();
const slugify = (value) => clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 90);

function categoryIdFromSheet(sheetName) {
  return CATEGORY_NAME_TO_ID[sheetName] || slugify(sheetName).replace(/-/g, '_');
}

function buildProduct(row, sheetName, uploadedImages = {}) {
  const sku = clean(row.SKU);
  const name = clean(row.BookName);
  const author = clean(row.Author);
  const publisher = clean(row.Publisher);
  const description = clean(row.Description);
  const imageKey = clean(row.ImageFileName) || `${sku}.jpg`;
  const gallery = uploadedImages[sku]?.gallery || [];
  const imageUrl = uploadedImages[imageKey]?.main || uploadedImages[sku]?.main || gallery[0] || '';
  const active = clean(row.Active) ? !falsey(row.Active) : true;

  return {
    sku,
    barcode: clean(row.Barcode),
    name,
    sub_category: clean(row.SubCategory),
    additional_categories: clean(row.AdditionalCategories).split('|').map((item) => item.trim()).filter(Boolean),
    author,
    rabbi: clean(row.Rabbi),
    publisher,
    description,
    long_description: clean(row.LongDescription),
    price: numberValue(row.Price),
    sale_price: numberValue(row.SalePrice),
    stock_quantity: numberValue(row.StockQuantity),
    weight: numberValue(row.Weight),
    language: clean(row.Language),
    image_url: imageUrl,
    gallery_urls: gallery,
    category: categoryIdFromSheet(sheetName),
    is_featured: truthy(row.Featured) || truthy(row.Recommended),
    is_new: truthy(row.New),
    is_on_sale: numberValue(row.SalePrice) > 0,
    in_stock: active && numberValue(row.StockQuantity) !== 0,
    seo_title: `${name} | אוצר הקדושה`,
    meta_description: description || [name, author, publisher].filter(Boolean).join(' - '),
    slug: slugify(`${name}-${sku}`),
    imported_at: new Date().toISOString(),
  };
}

function findDuplicate(product, existingProducts) {
  return existingProducts.find((item) => (
    (product.sku && item.sku === product.sku) ||
    (product.barcode && item.barcode === product.barcode) ||
    (product.name && product.author && item.name === product.name && item.author === product.author)
  ));
}

async function readWorkbook(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' }),
  }));
}

async function readImagesZip(file) {
  if (!file) return {};
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files).filter((entry) => !entry.dir && /\.(png|jpe?g|webp)$/i.test(entry.name));
  const result = {};

  for (const entry of entries) {
    const fileName = entry.name.split('/').pop();
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const sku = baseName.replace(/-\d+$/, '');
    const blob = await entry.async('blob');
    const imageFile = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });

    result[fileName] = { main: file_url };
    result[sku] ||= { main: '', gallery: [] };
    if (/-\d+$/.test(baseName)) {
      result[sku].gallery.push(file_url);
    } else {
      result[sku].main = file_url;
    }
  }

  return result;
}

export default function BulkBookImport() {
  const queryClient = useQueryClient();
  const [workbookFile, setWorkbookFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [action, setAction] = useState('upsert');
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [errors, setErrors] = useState([]);
  const [quickMode, setQuickMode] = useState('prices');

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products-import'],
    queryFn: () => base44.entities.Product.list('-created_date', 10000),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['import-history'],
    queryFn: () => base44.entities.ImportHistory.list('-created_date', 20),
  });

  const summary = useMemo(() => sheets.map((sheet) => ({
    category: sheet.sheetName,
    id: categoryIdFromSheet(sheet.sheetName),
    count: sheet.rows.length,
    missing: REQUIRED_COLUMNS.filter((col) => !Object.keys(sheet.rows[0] || {}).includes(col)),
  })), [sheets]);

  const previewRows = sheets.flatMap((sheet) => sheet.rows.slice(0, 6).map((row) => ({ sheetName: sheet.sheetName, ...row }))).slice(0, 30);

  const analyzeWorkbook = async () => {
    if (!workbookFile) return;
    setBusy(true);
    setErrors([]);
    try {
      const parsed = await readWorkbook(workbookFile);
      setSheets(parsed);
      setStep(2);
    } catch (error) {
      setErrors([error.message || 'קריאת קובץ Excel נכשלה']);
    } finally {
      setBusy(false);
    }
  };

  const executeImport = async () => {
    setBusy(true);
    setProgress(5);
    const counts = { created: 0, updated: 0, skipped: 0, errors: [] };
    try {
      const uploadedImages = await readImagesZip(zipFile);
      const rows = sheets.flatMap((sheet) => sheet.rows.map((row) => ({ sheetName: sheet.sheetName, row })));
      for (let i = 0; i < rows.length; i += 1) {
        const { sheetName, row } = rows[i];
        try {
          const product = buildProduct(row, sheetName, uploadedImages);
          if (!product.name || !product.price) {
            counts.skipped += 1;
          } else {
            const duplicate = findDuplicate(product, products);
            if (duplicate) {
              if (action === 'create' || action === 'skip') {
                counts.skipped += 1;
              } else {
                await base44.entities.Product.update(duplicate.id, product);
                counts.updated += 1;
              }
            } else if (action === 'update') {
              counts.skipped += 1;
            } else {
              await base44.entities.Product.create(product);
              counts.created += 1;
            }
          }
        } catch (error) {
          counts.errors.push(`${sheetName}: ${clean(row.BookName || row.SKU)} - ${error.message}`);
        }
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }
      await base44.entities.ImportHistory.create({
        file_name: workbookFile.name,
        import_type: 'bulk_books',
        categories_imported: summary.map((item) => item.category),
        products_created: counts.created,
        products_updated: counts.updated,
        products_skipped: counts.skipped,
        errors: counts.errors,
      });
      setReport(counts);
      setStep(6);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-import'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
    } finally {
      setBusy(false);
    }
  };

  const executeQuickUpdate = async () => {
    if (!workbookFile) return;
    setBusy(true);
    setProgress(5);
    const counts = { created: 0, updated: 0, skipped: 0, errors: [] };
    try {
      const parsed = await readWorkbook(workbookFile);
      const rows = parsed.flatMap((sheet) => sheet.rows);
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const match = findDuplicate({ sku: clean(row.SKU), barcode: clean(row.Barcode), name: clean(row.BookName), author: clean(row.Author) }, products);
        if (!match) {
          counts.skipped += 1;
        } else {
          const data = quickMode === 'prices'
            ? { price: numberValue(row.Price), sale_price: numberValue(row.SalePrice), is_on_sale: numberValue(row.SalePrice) > 0 }
            : { stock_quantity: numberValue(row.StockQuantity), in_stock: numberValue(row.StockQuantity) > 0 };
          await base44.entities.Product.update(match.id, data);
          counts.updated += 1;
        }
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }
      await base44.entities.ImportHistory.create({
        file_name: workbookFile.name,
        import_type: quickMode === 'prices' ? 'price_update' : 'inventory_update',
        categories_imported: [],
        products_updated: counts.updated,
        products_skipped: counts.skipped,
        errors: counts.errors,
      });
      setReport(counts);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-import'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">יבוא ספרים מאקסל</h1>
        <p className="mt-1 text-sm text-slate-500">בניית קטלוג ספרים מלא מקובץ Excel אחד וקובץ ZIP תמונות.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ['סה״כ ספרים', products.length],
          ['ספרים פעילים', products.filter((p) => p.in_stock).length],
          ['אזלו מהמלאי', products.filter((p) => !p.in_stock).length],
          ['מלאי נמוך', products.filter((p) => Number(p.stock_quantity || 0) > 0 && Number(p.stock_quantity || 0) <= 5).length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><UploadCloud className="h-5 w-5 text-blue-600" /> אשף יבוא קטלוג מלא</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">books.xlsx</span>
            <Input type="file" accept=".xlsx,.xls" onChange={(event) => setWorkbookFile(event.target.files?.[0] || null)} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">images.zip</span>
            <Input type="file" accept=".zip" onChange={(event) => setZipFile(event.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="border-amber-300 bg-amber-50 text-slate-900 hover:bg-amber-100">
            <a href={IMPORT_TEMPLATE_URL} download="תבנית יבוא ספרים - אוצר הקדושה.xlsx">
              <Download className="ml-2 h-4 w-4" /> הורדת תבנית Excel
            </a>
          </Button>
          <Button onClick={analyzeWorkbook} disabled={!workbookFile || busy} className="bg-blue-600 text-white hover:bg-blue-700">
            <FileSpreadsheet className="ml-2 h-4 w-4" /> זיהוי גיליונות
          </Button>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(IMPORT_ACTIONS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={executeImport} disabled={sheets.length === 0 || busy} variant="outline">ביצוע יבוא</Button>
        </div>
        {busy && <Progress value={progress} className="mt-4" />}
      </section>

      {summary.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><PackageSearch className="h-5 w-5 text-blue-600" /> גיליונות שזוהו</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summary.map((item) => (
              <div key={item.category} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-bold">{item.category}</p>
                <p className="mt-1 text-sm text-slate-500">{item.count} מוצרים</p>
                {item.missing.length > 0 ? <Badge className="mt-3 bg-rose-50 text-rose-700">חסרים: {item.missing.join(', ')}</Badge> : <Badge className="mt-3 bg-emerald-50 text-emerald-700">תקין</Badge>}
              </div>
            ))}
          </div>
        </section>
      )}

      {previewRows.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">תצוגה מקדימה</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>{['גיליון', ...BULK_COLUMNS.slice(0, 9)].map((col) => <th key={col} className="px-3 py-2 text-right">{col}</th>)}</tr>
              </thead>
              <tbody>{previewRows.map((row, index) => (
                <tr key={`${row.sheetName}-${index}`} className="border-t border-slate-100">
                  {['sheetName', ...BULK_COLUMNS.slice(0, 9)].map((col) => <td key={col} className="px-3 py-2 text-slate-700">{clean(row[col])}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><ImageIcon className="h-5 w-5 text-blue-600" /> מרכז עדכון מהיר</h2>
        <p className="mb-4 text-sm text-slate-500">מחירים: SKU, Price, SalePrice. מלאי: SKU, StockQuantity.</p>
        <div className="flex flex-wrap gap-3">
          <Select value={quickMode} onValueChange={setQuickMode}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prices">עדכון מחירים בלבד</SelectItem>
              <SelectItem value="inventory">עדכון מלאי בלבד</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={executeQuickUpdate} disabled={!workbookFile || busy} className="bg-blue-600 text-white hover:bg-blue-700">הפעל עדכון</Button>
        </div>
      </section>

      {report && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><CheckCircle2 className="h-5 w-5" /> דוח ביצוע</h2>
          <p>נוצרו: {report.created} | עודכנו: {report.updated} | דולגו: {report.skipped}</p>
          {report.errors.length > 0 && <p className="mt-2 flex items-center gap-2 text-rose-700"><AlertCircle className="h-4 w-4" /> שגיאות: {report.errors.length}</p>}
        </section>
      )}

      {errors.length > 0 && (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-800">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">היסטוריית יבוא</h2>
        <div className="space-y-2">
          {history.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <span className="font-semibold">{item.file_name}</span>
              <span className="text-slate-500">{item.import_type}</span>
              <span>נוצרו {item.products_created || 0} | עודכנו {item.products_updated || 0} | דולגו {item.products_skipped || 0}</span>
            </div>
          ))}
          {history.length === 0 && <p className="text-sm text-slate-500">אין היסטוריית יבוא עדיין.</p>}
        </div>
      </section>
    </div>
  );
}
