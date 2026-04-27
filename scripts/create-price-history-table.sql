-- ═══════════════════════════════════════════════════════
-- CREATE PRICE_HISTORY TABLE
-- ═══════════════════════════════════════════════════════

-- Crear tabla price_history para registrar cambios de precios
CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL, -- 'individual' o 'bulk'
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    difference DECIMAL(10,2),
    percentage_change DECIMAL(5,2),
    user_email TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Campos para cambios masivos (opcional)
    adjustment_type TEXT, -- 'percentage' o 'fixed'
    adjustment_value DECIMAL(10,2),
    affected_categories TEXT[], -- Array de categorías afectadas
    changes_count INTEGER DEFAULT 1
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_user_email ON price_history(user_email);
CREATE INDEX IF NOT EXISTS idx_price_history_type ON price_history(type);

-- Habilitar Row Level Security (RLS)
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso completo
CREATE POLICY "Allow full access to price_history" ON price_history
    FOR ALL USING (true) WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE price_history IS 'Historial de cambios de precios de productos';
COMMENT ON COLUMN price_history.id IS 'ID único del registro de historial';
COMMENT ON COLUMN price_history.product_id IS 'ID del producto afectado';
COMMENT ON COLUMN price_history.product_name IS 'Nombre del producto afectado';
COMMENT ON COLUMN price_history.category IS 'Categoría del producto';
COMMENT ON COLUMN price_history.type IS 'Tipo de cambio: individual o bulk';
COMMENT ON COLUMN price_history.old_price IS 'Precio anterior del producto';
COMMENT ON COLUMN price_history.new_price IS 'Nuevo precio del producto';
COMMENT ON COLUMN price_history.difference IS 'Diferencia absoluta del precio';
COMMENT ON COLUMN price_history.percentage_change IS 'Cambio porcentual';
COMMENT ON COLUMN price_history.user_email IS 'Email del usuario que hizo el cambio';
COMMENT ON COLUMN price_history.timestamp IS 'Fecha y hora del cambio';
COMMENT ON COLUMN price_history.adjustment_type IS 'Tipo de ajuste en cambios masivos';
COMMENT ON COLUMN price_history.adjustment_value IS 'Valor del ajuste en cambios masivos';
COMMENT ON COLUMN price_history.affected_categories IS 'Categorías afectadas en cambios masivos';
COMMENT ON COLUMN price_history.changes_count IS 'Cantidad de productos afectados en cambios masivos';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla price_history creada exitosamente';
    RAISE NOTICE '📊 Índices creados para mejor rendimiento';
    RAISE NOTICE '🔒 Row Level Security habilitado';
    RAISE NOTICE '📝 Políticas de acceso configuradas';
END $$;
