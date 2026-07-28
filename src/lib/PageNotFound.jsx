import { Link } from 'react-router-dom';
import { BookOpen, Home, MessageCircle } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { buildWhatsappUrl, useSiteSettings } from '@/hooks/useSiteSettings';

export default function PageNotFound() {
    useNoIndex();
    const { settings } = useSiteSettings();

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FCFAF5' }} dir="rtl">
            <div className="max-w-md w-full text-center">
                <p className="font-heading text-7xl font-bold text-gold/30 mb-2">404</p>
                <h1 className="font-heading text-2xl font-bold text-[#1F160F] mb-3">העמוד לא נמצא</h1>
                <p className="font-body text-[#6B5A45] leading-relaxed mb-8">
                    מצטערים, העמוד שחיפשתם לא קיים או שהוסר. אפשר לחזור לדף הבית או לעיין בקטלוג הספרים שלנו.
                </p>

                <div className="flex flex-col gap-3">
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 rounded-lg py-3 font-body text-sm font-semibold transition-colors"
                        style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        חזרה לדף הבית
                    </Link>
                    <Link
                        to="/catalog"
                        className="flex items-center justify-center gap-2 rounded-lg border border-gold/40 py-3 font-body text-sm font-semibold text-[#3A2415] transition-colors hover:border-gold hover:text-gold-deep"
                    >
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        לקטלוג הספרים
                    </Link>
                    {settings.whatsapp && (
                        <a
                            href={buildWhatsappUrl(settings.whatsapp, 'שלום, לא מצאתי עמוד באתר')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 rounded-lg py-3 font-body text-sm font-semibold text-[#6B5A45] transition-colors hover:text-gold-deep"
                        >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                            צריכים עזרה? דברו איתנו בוואטסאפ
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
