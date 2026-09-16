-- Fusionner les produits doublons (même nom)
-- Garder le premier, transférer tout vers lui, supprimer le deuxième

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

    -- Fusionner product_stock (même entrepôt → garder la plus grande quantité)
    DELETE FROM product_stock WHERE product_id = drop_id;

    -- Transférer les entrées/sorties
    UPDATE stock_entries SET product_id = keep_id WHERE product_id = drop_id;
    UPDATE stock_exits SET product_id = keep_id WHERE product_id = drop_id;

    -- Recalculer la quantité totale
    UPDATE products
    SET quantity = COALESCE((SELECT SUM(quantity) FROM product_stock WHERE product_id = keep_id), 0)
    WHERE id = keep_id;

    -- Supprimer le doublon
    DELETE FROM products WHERE id = drop_id;

    RAISE NOTICE 'Doublon supprimé: %, conservé: %', drop_id, keep_id;
  END LOOP;
END $$;
