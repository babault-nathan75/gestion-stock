-- Fusionner les produits doublons (même nom, casse-insensible)
-- Garder le premier, transférer les stocks du deuxième, supprimer le deuxième

DO $$
DECLARE
  rec RECORD;
  keep_id UUID;
  drop_id UUID;
BEGIN
  FOR rec IN
    SELECT LOWER(name) AS lname, array_agg(id ORDER BY created_at) AS ids
    FROM products
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
  LOOP
    keep_id := rec.ids[1];
    drop_id := rec.ids[2];

    -- Transférer product_stock du doublon vers le conservé
    UPDATE product_stock
    SET product_id = keep_id
    WHERE product_id = drop_id
      AND NOT EXISTS (
        SELECT 1 FROM product_stock ps2
        WHERE ps2.product_id = keep_id AND ps2.warehouse = product_stock.warehouse
      );

    -- Supprimer le stock du doublon restant (déjà transféré ou conflit)
    DELETE FROM product_stock WHERE product_id = drop_id;

    -- Transférer stock_entries
    UPDATE stock_entries SET product_id = keep_id WHERE product_id = drop_id;
    UPDATE stock_exits SET product_id = keep_id WHERE product_id = drop_id;

    -- Mettre à jour la quantité totale du produit conservé
    UPDATE products
    SET quantity = COALESCE((SELECT SUM(quantity) FROM product_stock WHERE product_id = keep_id), 0)
    WHERE id = keep_id;

    -- Supprimer le doublon
    DELETE FROM products WHERE id = drop_id;

    RAISE NOTICE 'Fusionné doublon % dans %', drop_id, keep_id;
  END LOOP;
END $$;

-- Vérification : plus aucun doublon
SELECT LOWER(name) AS nom, COUNT(*) AS nb
FROM products
GROUP BY LOWER(name)
HAVING COUNT(*) > 1;
