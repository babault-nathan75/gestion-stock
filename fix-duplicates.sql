-- ============================================
-- GESTOCK - Fusion des produits en double (casse-insensible)
-- À exécuter dans le Supabase SQL Editor
--
-- 1. Détecte les doublons (même nom, casse différente)
-- 2. Conserve la version la plus utilisée (plus de stock)
-- 3. Transfère stock_entries, stock_exits, product_stock vers le produit conservé
-- 4. Supprime les doublons
-- 5. Empêche les futurs doublons (contrainte UNIQUE sur LOWER(name))
-- ============================================

DO $$
DECLARE
  dup RECORD;
  keep_id UUID;
  drop_id UUID;
BEGIN
  -- Pour chaque groupe de doublons (LOWER(name))
  FOR dup IN
    SELECT LOWER(name) AS norm, array_agg(id ORDER BY quantity DESC, created_at ASC) AS ids
    FROM products
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
  LOOP
    keep_id := dup.ids[1];  -- produit à garder (le + gros stock, ou le plus ancien)

    FOR i IN 2..array_length(dup.ids, 1) LOOP
      drop_id := dup.ids[i];

      -- Transférer les entrées
      UPDATE stock_entries SET product_id = keep_id WHERE product_id = drop_id;
      -- Transférer les sorties
      UPDATE stock_exits SET product_id = keep_id WHERE product_id = drop_id;
      -- Transférer le stock par entrepôt
      INSERT INTO product_stock (product_id, warehouse, quantity)
      SELECT keep_id, warehouse, quantity FROM product_stock WHERE product_id = drop_id
      ON CONFLICT (product_id, warehouse)
      DO UPDATE SET quantity = product_stock.quantity + EXCLUDED.quantity;
      -- Supprimer les lignes product_stock du doublon
      DELETE FROM product_stock WHERE product_id = drop_id;
      -- Supprimer le produit doublon
      DELETE FROM products WHERE id = drop_id;
    END LOOP;

    -- Recalculer la quantité globale du produit conservé
    UPDATE products p
    SET quantity = COALESCE(
      (SELECT SUM(quantity) FROM product_stock WHERE product_id = keep_id),
      0
    )
    WHERE p.id = keep_id;
  END LOOP;
END $$;

-- Contrainte unique pour empêcher les futurs doublons (insensible à la casse)
-- Note : PostgreSQL ne supporte pas directement UNIQUE sur LOWER(colonne)
-- via un index partiel, mais un trigger le garantit.
CREATE OR REPLACE FUNCTION prevent_duplicate_products()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM products
    WHERE LOWER(name) = LOWER(NEW.name)
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Un produit avec ce nom existe déjà (insensible à la casse)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_duplicate_products ON products;
CREATE TRIGGER trg_no_duplicate_products
  BEFORE INSERT OR UPDATE OF name ON products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_products();

-- Vérification : plus aucun doublon
SELECT LOWER(name) AS nom, COUNT(*) AS nb
FROM products
GROUP BY LOWER(name)
HAVING COUNT(*) > 1;