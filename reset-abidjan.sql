-- ============================================
-- GESTOCK - Vidage UNIQUEMENT de l'entrepôt Abidjan + nouveau catalogue
-- À exécuter dans le Supabase SQL Editor
--
-- Effet :
--   1. Retire des quantités globales la part Abidjan des produits qui sont
--      aussi présents à Sinfra/Paris (AVANT la purge)
--   2. Supprime les entrées/sorties/stock de l'entrepôt Abidjan
--   3. Supprime les produits exclusivement présents à Abidjan
--   4. Crée les 11 nouveaux produits (stock initial vs Abidjan)
--
-- N'EST PAS touché : entrepôts Sinfra et Paris (produits, mouvements,
-- stock), catégories, comptes admins.
--
-- Tout est dans un bloc DO unique : une seule transaction, annulée
-- automatiquement en cas d'erreur. (Évite le problème des tables
-- temporaires de l'éditeur SQL.)
-- ============================================

DO $$
BEGIN
  -- 1) Ajuster la quantité globale des produits conservés (présents aussi
  --    à Sinfra/Paris) : on retire leur part Abidjan, mesurée AVANT la purge.
  UPDATE products p
  SET quantity = GREATEST(0, p.quantity - COALESCE(x.qty, 0))
  FROM (
    SELECT ab.product_id, SUM(ab.quantity) AS qty
    FROM product_stock ab
    JOIN (
      SELECT DISTINCT product_id
      FROM product_stock
      WHERE warehouse IN ('Sinfra', 'Paris')
    ) k ON k.product_id = ab.product_id
    WHERE ab.warehouse = 'Abidjan'
    GROUP BY ab.product_id
  ) x
  WHERE p.id = x.product_id;

  -- 2) Purge des mouvements et du stock d'Abidjan
  DELETE FROM stock_entries WHERE warehouse = 'Abidjan';
  DELETE FROM stock_exits WHERE warehouse = 'Abidjan';
  DELETE FROM product_stock WHERE warehouse = 'Abidjan';

  -- 3) Suppression des produits qui n'existent PAS dans Sinfra/Paris
  DELETE FROM products p
  WHERE NOT EXISTS (
    SELECT 1 FROM product_stock ps
    WHERE ps.product_id = p.id AND ps.warehouse IN ('Sinfra', 'Paris')
  )
  AND NOT EXISTS (
    SELECT 1 FROM stock_entries se
    WHERE se.product_id = p.id AND se.warehouse IN ('Sinfra', 'Paris')
  )
  AND NOT EXISTS (
    SELECT 1 FROM stock_exits sx
    WHERE sx.product_id = p.id AND sx.warehouse IN ('Sinfra', 'Paris')
  );

  -- 4) Nouveau catalogue (quantité = stock de départ Abidjan, prix à définir)
  INSERT INTO products (name, category, quantity, price, alert_threshold, created_at) VALUES
    ('Diabo care',      NULL, 5, 0, 5, now()),
    ('Women care',      NULL, 3, 0, 5, now()),
    ('Pilon care',      NULL, 3, 0, 5, now()),
    ('Detox health',    NULL, 6, 0, 5, now()),
    ('Sea buckthorn',   NULL, 1, 0, 5, now()),
    ('Costi away',      NULL, 4, 0, 5, now()),
    ('Immuno boost',    NULL, 4, 0, 5, now()),
    ('Alka plus',       NULL, 2, 0, 5, now()),
    ('Yupi drunk',      NULL, 1, 0, 5, now()),
    ('Golden pain oil', NULL, 1, 0, 5, now()),
    ('Men power oil',   NULL, 1, 0, 5, now());

  -- 5) Stock initial des nouveaux produits dans Abidjan uniquement
  INSERT INTO product_stock (product_id, warehouse, quantity)
  SELECT id, 'Abidjan', quantity FROM products
  WHERE name IN (
    'Diabo care', 'Women care', 'Pilon care', 'Detox health', 'Sea buckthorn',
    'Costi away', 'Immuno boost', 'Alka plus', 'Yupi drunk',
    'Golden pain oil', 'Men power oil'
  )
  ON CONFLICT (product_id, warehouse) DO NOTHING;
END $$;

-- Vérifications (après exécution du bloc ci-dessus)
SELECT w.name, COUNT(*) AS produits
FROM product_stock ps
JOIN warehouses w ON w.name = ps.warehouse
GROUP BY w.name ORDER BY w.name;

SELECT name, quantity FROM products ORDER BY name;