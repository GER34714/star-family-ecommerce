-- Actualizar tabla payment_settings para incluir los nuevos campos
-- Ejecutar esto en el panel SQL de Supabase

-- Agregar nuevas columnas si no existen
ALTER TABLE payment_settings 
ADD COLUMN IF NOT EXISTS titular TEXT,
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS mp_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS transfer_enabled BOOLEAN DEFAULT true;

-- Renombrar account_name a titular si es necesario (opcional)
-- UPDATE payment_settings SET titular = account_name WHERE titular IS NULL AND account_name IS NOT NULL;

-- Crear registro por defecto si no existe
INSERT INTO payment_settings (id, cbu, alias, titular, banco, mp_enabled, transfer_enabled)
VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  '0000000000000000000000000000',
  'tu.alias.bancario',
  'Nombre del Titular',
  'Nombre del Banco',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;
