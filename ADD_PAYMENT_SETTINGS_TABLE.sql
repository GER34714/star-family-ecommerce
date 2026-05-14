-- ═════════════════════════════════════════════════════
-- AGREGAR TABLA PAYMENT_SETTINGS CON CAMPO IS_ACTIVE
-- ═════════════════════════════════════════════════════

-- Crear tabla de configuración de pagos si no existe
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  cbu TEXT DEFAULT '',
  alias TEXT DEFAULT '',
  titular TEXT DEFAULT '',
  banco TEXT DEFAULT '',
  mp_enabled BOOLEAN DEFAULT false,
  transfer_enabled BOOLEAN DEFAULT false,
  extra_message TEXT DEFAULT 'Una vez pagado, enviá el comprobante por mensaje 📩',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para payment_settings
CREATE INDEX IF NOT EXISTS idx_payment_settings_is_active ON payment_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_settings_created_at ON payment_settings(created_at);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar registro por defecto si no existe ninguno
INSERT INTO payment_settings (
  id, 
  account_name, 
  bank_name, 
  cbu, 
  alias, 
  titular, 
  banco, 
  mp_enabled, 
  transfer_enabled, 
  extra_message,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  false,
  'Una vez pagado, enviá el comprobante por mensaje 📩',
  true
) ON CONFLICT (id) DO NOTHING;

-- Política RLS para que solo usuarios master puedan modificar
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_settings_full_access_for_master" ON payment_settings;
CREATE POLICY "payment_settings_full_access_for_master" ON payment_settings
  FOR ALL USING (is_master_user())
  WITH CHECK (is_master_user());

-- Política de lectura para usuarios autenticados
DROP POLICY IF EXISTS "payment_settings_read_for_authenticated" ON payment_settings;
CREATE POLICY "payment_settings_read_for_authenticated" ON payment_settings
  FOR SELECT USING (auth.role() = 'authenticated');

COMMIT;
