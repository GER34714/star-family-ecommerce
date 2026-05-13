import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const BannerSection = ({ banners = [], loading = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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
        height: "300px", 
        overflow: "hidden", 
        borderRadius: "12px",
        margin: "16px 0",
        background: "#000"
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
            height: "100%"
          }}
        >
          {/* Imagen del banner */}
          <img
            src={currentBanner.image_url}
            alt={currentBanner.title || "Banner"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "#000"
            }}
          />
          
          {/* Overlay con texto */}
          {(currentBanner.title || currentBanner.description) && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                padding: "20px",
                color: "white"
              }}
            >
              {currentBanner.title && (
                <h2 style={{
                  margin: "0 0 8px 0",
                  fontSize: "24px",
                  fontWeight: "bold",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.8)"
                }}>
                  {currentBanner.title}
                </h2>
              )}
              {currentBanner.description && (
                <p style={{
                  margin: 0,
                  fontSize: "16px",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.8)"
                }}>
                  {currentBanner.description}
                </p>
              )}
            </div>
          )}

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
              top: "50%",
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
              top: "50%",
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
