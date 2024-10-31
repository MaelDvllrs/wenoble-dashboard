import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 35px);
  grid-template-rows: repeat(auto-fill, 35px);
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
`;

const Point = styled.div`
  width: 10px;
  height: 10px;
  background: black;
  border-radius: 5px;
  background: radial-gradient(circle at 3px 3px, var(--primary-color), #000);
  transition: transform 0.8s ease-out;
`;

const BackgroundAnimation = () => {
  const gridRef = useRef(null);
  const pointsRef = useRef([]);
  const animationFrameId = useRef(null);
  const maxDistance = 150;

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      animationFrameId.current = requestAnimationFrame(() => {
        const { clientX, clientY } = event;

        pointsRef.current.forEach((point) => {
          const rect = point.getBoundingClientRect();
          const distance = Math.hypot(rect.x - clientX, rect.y - clientY);

          const moveDistance = Math.max(0, (maxDistance - distance) / 2);
          const angle = Math.atan2(rect.y - clientY, rect.x - clientX);
          const moveX = Math.cos(angle) * moveDistance;
          const moveY = Math.sin(angle) * moveDistance;
          const scale = 1 + Math.max(0, (maxDistance - distance) / maxDistance);

          point.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale})`;
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const createGrid = () => {
    const points = [];
    for (let i = 0; i < 1000; i++) {
      points.push(<Point ref={(el) => pointsRef.current[i] = el} key={i} />);
    }
    return points;
  };

  return <Grid ref={gridRef}>{createGrid()}</Grid>;
};

export default BackgroundAnimation;