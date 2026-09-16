-- Migration: ajouter la colonne warehouse à la table admins
-- Exécuter dans le SQL Editor de Supabase Dashboard

ALTER TABLE admins ADD COLUMN IF NOT EXISTS warehouse TEXT;
