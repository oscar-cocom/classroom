import React, { useEffect, useRef } from 'react';

// Aspect ratio of src/assets/loader-animation.json (1006 × 846)
const RATIO = 846 / 1006;

/**
 * The platform's loading animation (Lottie). The player and the animation load
 * as a separate chunk the first time, so they don't slow down the initial page;
 * the label shows right away. Stays still for users who prefer reduced motion.
 */
export function LoadingAnimation({ label = 'Cargando…', size = 160, fullScreen = false }) {
  const container = useRef(null);

  useEffect(() => {
    let animation;
    let cancelled = false;
    Promise.all([
      import('lottie-web/build/player/lottie_light'),
      import('@/assets/loader-animation.json'),
    ]).then(([{ default: lottie }, { default: animationData }]) => {
      if (cancelled || !container.current) return;
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      animation = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: !reduceMotion,
        autoplay: !reduceMotion,
        animationData,
      });
      if (reduceMotion) animation.goToAndStop(40, true);
    }).catch(() => {
      // Without the animation the label alone still says it's loading
    });
    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2 text-muted-foreground ${fullScreen ? 'min-h-screen bg-background' : 'min-h-[60vh] py-10'}`}
    >
      <div ref={container} style={{ width: size, height: Math.round(size * RATIO) }} aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
