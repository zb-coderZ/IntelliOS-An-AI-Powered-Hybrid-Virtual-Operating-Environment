import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SnapPreviewData } from "../../types/desktop";
import { useTheme } from "../../context/ThemeContext";

interface SnapPreviewOverlayProps {
  preview: SnapPreviewData | null;
}

export const SnapPreviewOverlay: React.FC<SnapPreviewOverlayProps> = ({ preview }) => {
  const { reduceMotion } = useTheme();

  return (
    <AnimatePresence>
      {preview && (
        <motion.div
          className="snap-preview-box"
          style={{
            position: "fixed",
            left: preview.x,
            top: preview.y,
            width: preview.width,
            height: preview.height,
            zIndex: 400,
            pointerEvents: "none",
          }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{
            duration: reduceMotion ? 0.01 : 0.18,
            ease: "easeOut",
          }}
        >
          <div className="snap-preview-inner" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

