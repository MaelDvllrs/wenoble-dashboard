// Organize imports: external libraries first, then internal modules
import React, { useRef, useEffect } from 'react';
import createGlobe from 'cobe';
import { useSpring } from 'react-spring';
import { useTheme } from '@mui/material/styles';

// Component definition
export const GlobeComponent = () => {
    // Refs and state
    const canvasRef = useRef();
    const pointerInteracting = useRef(null);
    const pointerInteractionMovement = useRef(0);
    const [{ r }, api] = useSpring(() => ({
        r: 0,
        config: {
            mass: 1,
            tension: 280,
            friction: 40,
            precision: 0.001,
        },
    }));

    const theme = useTheme();

    // Effect for initializing the globe
    useEffect(() => {
        let width = 0;
        let phi = 0;
        const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth);
        window.addEventListener('resize', onResize);
        onResize();

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: width * 2,
            height: width * 2,
            phi: 0,
            theta: 0.3,
            dark: theme.palette.globe.dark,
            diffuse: 3,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [1, 1, 1],
            markerColor: [67 / 255, 246 / 255, 139 / 255],
            glowColor: [0.3, 0.3, 0.3],
            markers: [
                { location: [46, 5], size: 0.1 },
            ],
            onRender: (state) => {
                if (!pointerInteracting.current) {
                    phi += 0.005;
                }
                state.phi = phi + r.get();
                state.width = width * 2;
                state.height = width * 2;
            },
        });

        setTimeout(() => canvasRef.current.style.opacity = '1');

        return () => {
            globe.destroy();
            window.removeEventListener('resize', onResize);
        };
    }, [r, theme.palette.globe.dark]);

    // Handlers for pointer interactions
    const handlePointerDown = (e) => {
        pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
        canvasRef.current.style.cursor = 'grabbing';
    };

    const handlePointerUp = () => {
        pointerInteracting.current = null;
        canvasRef.current.style.cursor = 'grab';
    };

    const handlePointerMove = (e) => {
        if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            api.start({ r: delta / 200 });
        }
    };

    const handleTouchMove = (e) => {
        if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            api.start({ r: delta / 100 });
        }
    };

    // JSX
    return (
        <div
            style={{
                width: '100%',
                maxWidth: 600,
                aspectRatio: 1,
                margin: 'auto',
                position: 'relative',
            }}
        >
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerOut={handlePointerUp}
                onMouseMove={handlePointerMove}
                onTouchMove={handleTouchMove}
                style={{
                    width: '100%',
                    height: '100%',
                    cursor: 'grab',
                    contain: 'layout paint size',
                    opacity: 0,
                    transition: 'opacity 1s ease',
                }}
            />
        </div>
    );
};