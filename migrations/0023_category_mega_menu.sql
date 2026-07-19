ALTER TABLE categories ADD COLUMN mega_menu_enabled INTEGER NOT NULL DEFAULT 1 CHECK (mega_menu_enabled IN (0, 1));
ALTER TABLE categories ADD COLUMN mega_menu_show_products INTEGER NOT NULL DEFAULT 1 CHECK (mega_menu_show_products IN (0, 1));
ALTER TABLE categories ADD COLUMN mega_menu_desktop_count INTEGER NOT NULL DEFAULT 2;
ALTER TABLE categories ADD COLUMN mega_menu_mobile_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE categories ADD COLUMN mega_menu_rotation_seconds INTEGER NOT NULL DEFAULT 120;
ALTER TABLE categories ADD COLUMN mega_menu_in_stock_only INTEGER NOT NULL DEFAULT 0 CHECK (mega_menu_in_stock_only IN (0, 1));
ALTER TABLE categories ADD COLUMN mega_menu_show_add_to_cart INTEGER NOT NULL DEFAULT 1 CHECK (mega_menu_show_add_to_cart IN (0, 1));
ALTER TABLE categories ADD COLUMN mega_menu_show_view_all INTEGER NOT NULL DEFAULT 1 CHECK (mega_menu_show_view_all IN (0, 1));
