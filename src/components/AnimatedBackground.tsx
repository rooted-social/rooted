'use client';

import React, { useRef, useEffect } from 'react';

/**
 * 메모장 스타일 물결 배경 컴포넌트
 * 5개의 색상 라인이 화면을 메모장처럼 가득 채우면서 파도처럼 물결치는 움직임을 연출합니다.
 * 창의적이고 다이나믹한 시각적 효과를 제공합니다.
 */
interface AnimatedBackgroundProps { zIndexClass?: string }

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ zIndexClass = '-z-20' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기를 윈도우 크기에 맞춤
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // 초기 설정 및 리사이즈 이벤트 리스너 등록
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 물결 라인 타입 정의
    type Wave = {
      amplitude: number;
      period: number;
      phase: number;
      lineWidth: number;
      yPosition: number;
      speed: number;
      color: string;
    };

    // 물결 라인 설정
    const waves: Wave[] = [];
    const totalWaves = 5; // 라인 개수 5개로 설정
    
    // 라인 간 간격 계산 (균등 분포 - 메모장 효과)
    const lineSpacing = Math.floor(canvas.height / (totalWaves + 1));
    
    // 5개의 라인 색상: 동일한 검정색 계열로統일
    const colors = [
      'rgba(0, 0, 0, 0.15)',
      'rgba(0, 0, 0, 0.15)',
      'rgba(0, 0, 0, 0.15)',
      'rgba(0, 0, 0, 0.15)',
      'rgba(0, 0, 0, 0.15)'
    ];

    // 물결 객체 초기화
    for (let i = 0; i < totalWaves; i++) {
      const amplitude = Math.random() * 5 + 8; // 8-28 사이의 진폭 (더 강하게)
      const period = Math.random() * 400 + 400; // 400-800 사이의 주기
      const phase = Math.random() * Math.PI * 2; // 초기 위상
      const lineWidth = Math.random() * 1.0 + 1.5; // 4.0-8.0 사이 선 두께 (훨씬 두께게)
      const yPosition = lineSpacing * (i + 1); // 균등한 간격으로 배치 (메모장 느낌)
      const speed = (Math.random() * 0.02 + 0.004) * (Math.random() > 0.5 ? 1 : -1); // 속도와 방향
      
      waves.push({
        amplitude,
        period,
        phase,
        lineWidth,
        yPosition,
        speed,
        color: colors[i] // 5개의 색상이 순서대로 각 라인에 적용
      });
    }

    const animate = () => {
      // 배경: 사이드바와 동일한 흰색으로 통일
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 1.0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 각 물결 라인 그리기
      waves.forEach(wave => {
        ctx.beginPath();
        ctx.lineWidth = wave.lineWidth;
        ctx.strokeStyle = wave.color;

        // 물결 곡선 그리기
        for (let x = 0; x <= canvas.width; x += 1) { // 1픽셀 간격으로 더 세밀하게
          // 사인 함수를 사용한 물결 효과 계산
          const y = wave.yPosition + 
                  Math.sin((x / wave.period) + wave.phase) * wave.amplitude + 
                  Math.sin((x / (wave.period * 0.5)) + wave.phase * 1.8) * (wave.amplitude * 0.5);
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // 위상 업데이트 (움직임 효과)
        wave.phase += wave.speed;

        ctx.stroke();
      });

      requestAnimationFrame(animate);
    };

    animate();

    // 클린업 함수
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className={`fixed inset-0 overflow-hidden ${zIndexClass} pointer-events-none`}>
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};

export { AnimatedBackground };
export default AnimatedBackground;