import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const BannerSection = ({ banners = [], loading = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);

    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  // Auto-advance banner
  useEffect(() => {
    if (isPaused || banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Cambiar cada 5 segundos

    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (loading) {
    return (
      <div style={{ 
        background: "#f0f0f0", 
        height: "300px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        borderRadius: "12px",
        margin: "16px 0"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
          <div style={{ color: "#666" }}>Cargando banners...</div>
        </div>
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return null; // No mostrar nada si no hay banners
  }

  const currentBanner = banners[currentIndex];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: isMobile ? "350px" : "300px",
        overflow: "hidden",
        borderRadius: "0px",
        margin: "16px 0",
        background: "transparent"
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          transition={{ duration: 0.5 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Imagen del banner */}
          <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={currentBanner.image_url}
              alt={currentBanner.title || "Banner"}
              style={{
                width: "100%",
                height: isMobile ? "100%" : "auto",
                maxHeight: isMobile ? undefined : "220px",
                objectFit: "contain",
                objectPosition: "center",
                background: "transparent"
              }}
            />
            {/* Link overlay si tiene enlace */}
            {currentBanner.link && (
              <a
                href={currentBanner.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "block",
                  textDecoration: "none"
                }}
                aria-label={`Ir a ${currentBanner.title || "enlace del banner"}`}
              />
            )}
          </div>

          {/* Texto debajo de la imagen */}
          {(currentBanner.title || currentBanner.description) && (
            <div
              style={{
                padding: isMobile ? "14px 16px 26px" : "20px",
                background: "#111",
                color: "white"
              }}
            >
              {currentBanner.title && (
                <h2 style={{
                  margin: isMobile ? "0 0 6px 0" : "0 0 8px 0",
                  fontSize: isMobile ? "20px" : "24px",
                  fontWeight: "bold"
                }}>
                  {currentBanner.title}
                </h2>
              )}
              {currentBanner.description && (
                <p style={{
                  margin: 0,
                  fontSize: isMobile ? "14px" : "16px"
                }}>
                  {currentBanner.description}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Controles de navegación */}
      {banners.length > 1 && (
        <>
          {/* Botones anterior/siguiente */}
          <button
            onClick={handlePrev}
            style={{
              position: "absolute",
              left: "10px",
              top: isMobile ? "21%" : "50%",
              transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.5)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "18px",
              transition: "background 0.3s"
            }}
            onMouseOver={(e) => e.target.style.background = "rgba(0,0,0,0.7)"}
            onMouseOut={(e) => e.target.style.background = "rgba(0,0,0,0.5)"}
          >
            ‹
          </button>
          
          <button
            onClick={handleNext}
            style={{
              position: "absolute",
              right: "10px",
              top: isMobile ? "21%" : "50%",
              transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.5)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "18px",
              transition: "background 0.3s"
            }}
            onMouseOver={(e) => e.target.style.background = "rgba(0,0,0,0.7)"}
            onMouseOut={(e) => e.target.style.background = "rgba(0,0,0,0.5)"}
          >
            ›
          </button>

          {/* Indicadores (dots) */}
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "8px",
              zIndex: 10
            }}
          >
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  border: "none",
                  background: index === currentIndex ? "white" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  transition: "background 0.3s"
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BannerSection;
