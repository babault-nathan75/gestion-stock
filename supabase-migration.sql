-- ============================================
-- GESTION DE STOCK - Migration Supabase
-- ============================================

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  alert_threshold INTEGER DEFAULT 5,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed des 9 catégories initiales
INSERT INTO categories (name) VALUES
  ('Poudre'),
  ('Gélule'),
  ('Pommade'),
  ('Liquide'),
  ('Dentifrice'),
  ('Capsule'),
  ('Confiture'),
  ('Huile'),
  ('Spray')
ON CONFLICT (name) DO NOTHING;

-- Table des entrepôts
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO warehouses (name) VALUES ('Abidjan'), ('Sinfra')
ON CONFLICT (name) DO NOTHING;

-- Table des entrées de stock (réceptions)
CREATE TABLE IF NOT EXISTS stock_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID DEFAULT gen_random_uuid() NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) DEFAULT 0,
  warehouse TEXT NOT NULL DEFAULT 'Abidjan',
  origin TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des sorties de stock (expéditions)
CREATE TABLE IF NOT EXISTS stock_exits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID DEFAULT gen_random_uuid() NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) DEFAULT 0,
  warehouse TEXT NOT NULL DEFAULT 'Abidjan',
  destination TEXT NOT NULL,
  recipient TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table stock par entrepôt
CREATE TABLE IF NOT EXISTS product_stock (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  PRIMARY KEY (product_id, warehouse)
);

-- ============================================
-- TRIGGERS: Mise à jour automatique du stock
-- ============================================

-- Augmenter le stock à chaque entrée
CREATE OR REPLACE FUNCTION update_stock_on_entry()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET quantity = quantity + NEW.quantity WHERE id = NEW.product_id;
  INSERT INTO product_stock (product_id, warehouse, quantity)
  VALUES (NEW.product_id, NEW.warehouse, NEW.quantity)
  ON CONFLICT (product_id, warehouse)
  DO UPDATE SET quantity = product_stock.quantity + NEW.quantity;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_stock_entry ON stock_entries;
CREATE TRIGGER on_stock_entry
  AFTER INSERT ON stock_entries
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_entry();

-- Diminuer le stock à chaque sortie
CREATE OR REPLACE FUNCTION update_stock_on_exit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET quantity = quantity - NEW.quantity WHERE id = NEW.product_id;
  INSERT INTO product_stock (product_id, warehouse, quantity)
  VALUES (NEW.product_id, NEW.warehouse, 0)
  ON CONFLICT (product_id, warehouse) DO NOTHING;
  UPDATE product_stock
  SET quantity = quantity - NEW.quantity
  WHERE product_id = NEW.product_id AND warehouse = NEW.warehouse;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_stock_exit ON stock_exits;
CREATE TRIGGER on_stock_exit
  AFTER INSERT ON stock_exits
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_exit();

-- ============================================
-- POLITIQUES RLS (Row Level Security)
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_exits ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stock_entries" ON stock_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stock_exits" ON stock_exits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on product_stock" ON product_stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on warehouses" ON warehouses FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- MIGRATIONS COMPLÉMENTAIRES (si tables existent déjà)
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 5;
ALTER TABLE stock_entries ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE stock_exits ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE stock_entries ADD COLUMN IF NOT EXISTS warehouse TEXT NOT NULL DEFAULT 'Abidjan';
ALTER TABLE stock_exits ADD COLUMN IF NOT EXISTS warehouse TEXT NOT NULL DEFAULT 'Abidjan';

-- Seed product_stock pour les produits existants dans Abidjan
INSERT INTO product_stock (product_id, warehouse, quantity)
SELECT id, 'Abidjan', quantity FROM products
ON CONFLICT (product_id, warehouse) DO NOTHING;

-- Index pour les requêtes par entrepôt
CREATE INDEX IF NOT EXISTS idx_stock_entries_warehouse ON stock_entries(warehouse);
CREATE INDEX IF NOT EXISTS idx_stock_exits_warehouse ON stock_exits(warehouse);
CREATE INDEX IF NOT EXISTS idx_product_stock_warehouse ON product_stock(warehouse);
