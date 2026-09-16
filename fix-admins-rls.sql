-- Supprimer l'ancienne politique et en créer une nouvelle qui fonctionne
DROP POLICY IF EXISTS "Allow all on admins" ON admins;

CREATE POLICY "admins_all_policy" ON admins
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- S'assurer que la colonne warehouse existe
ALTER TABLE admins ADD COLUMN IF NOT EXISTS warehouse TEXT;
