import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler() {
  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #020a18 0%, #0a1628 50%, #030c1f 100%)',
          fontFamily: 'Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          // Decorative circles
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                width: 400,
                height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(28,232,255,0.08) 0%, transparent 70%)',
                top: -100,
                left: -100,
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                width: 500,
                height: 500,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)',
                bottom: -150,
                right: -100,
              },
            },
          },
          // SKYTEAM label
          {
            type: 'div',
            props: {
              style: {
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 8,
                color: 'rgba(28,232,255,0.6)',
                marginBottom: 20,
              },
              children: 'SKYTEAM',
            },
          },
          // Main title
          {
            type: 'div',
            props: {
              style: {
                fontSize: 60,
                fontWeight: 900,
                color: '#FFFFFF',
                marginBottom: 16,
                textAlign: 'center',
              },
              children: 'Tu Franquicia Digital',
            },
          },
          // Subtitle
          {
            type: 'div',
            props: {
              style: {
                fontSize: 26,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 40,
                textAlign: 'center',
              },
              children: 'Plataforma completa con IA para construir tu negocio',
            },
          },
          // Features row
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                gap: 16,
                marginBottom: 40,
              },
              children: [
                { type: 'div', props: { style: { background: 'rgba(28,232,255,0.1)', border: '1px solid rgba(28,232,255,0.3)', borderRadius: 20, padding: '10px 22px', fontSize: 15, fontWeight: 700, color: '#1CE8FF' }, children: '🤖 6 Agentes IA' } },
                { type: 'div', props: { style: { background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 20, padding: '10px 22px', fontSize: 15, fontWeight: 700, color: '#FFD700' }, children: '📊 CRM Pro' } },
                { type: 'div', props: { style: { background: 'rgba(57,255,126,0.08)', border: '1px solid rgba(57,255,126,0.2)', borderRadius: 20, padding: '10px 22px', fontSize: 15, fontWeight: 700, color: '#39FF7E' }, children: '🎓 Academia' } },
                { type: 'div', props: { style: { background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 20, padding: '10px 22px', fontSize: 15, fontWeight: 700, color: '#7F77DD' }, children: '📅 Agenda' } },
              ],
            },
          },
          // CTA
          {
            type: 'div',
            props: {
              style: {
                background: 'linear-gradient(135deg, #1CE8FF, #0077FF)',
                borderRadius: 28,
                padding: '14px 50px',
                fontSize: 20,
                fontWeight: 900,
                color: '#030c1f',
              },
              children: 'Comienza hoy → skyteam.global',
            },
          },
          // Bottom accent line
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: 5,
                background: 'linear-gradient(90deg, #1CE8FF, #0077FF)',
                opacity: 0.5,
              },
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
    }
  );
}
