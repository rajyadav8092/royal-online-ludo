import React from 'react';

/**
 * Fixed, blurred decorative Ludo board pattern flanking the centered mobile game frame
 * on desktop, PlayStation, tablet, and wide screens.
 * Uses standard CSS filter: blur() on a static SVG layer behind the opaque game container
 * (never backdrop-filter over WebGL) so 3D rendering remains crisp and fast.
 */
export const BlurredLudoBackdrop: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden bg-[#061124] sm:block"
    >
      <div
        className="absolute inset-0 scale-110 opacity-55"
        style={{
          filter: 'blur(12px) saturate(1.25) brightness(0.55)',
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 360 360'>
              <rect width='360' height='360' fill='#0b1e3b'/>
              <g opacity='0.85'>
                <rect x='18' y='18' width='150' height='150' rx='18' fill='#b91c1c' stroke='#facc15' stroke-width='4'/>
                <rect x='40' y='40' width='106' height='106' rx='12' fill='#fef2f2' opacity='0.85'/>
                <circle cx='68' cy='68' r='14' fill='#dc2626'/>
                <circle cx='118' cy='68' r='14' fill='#dc2626'/>
                <circle cx='68' cy='118' r='14' fill='#dc2626'/>
                <circle cx='118' cy='118' r='14' fill='#dc2626'/>

                <rect x='192' y='18' width='150' height='150' rx='18' fill='#15803d' stroke='#facc15' stroke-width='4'/>
                <rect x='214' y='40' width='106' height='106' rx='12' fill='#f0fdf4' opacity='0.85'/>
                <circle cx='242' cy='68' r='14' fill='#16a34a'/>
                <circle cx='292' cy='68' r='14' fill='#16a34a'/>
                <circle cx='242' cy='118' r='14' fill='#16a34a'/>
                <circle cx='292' cy='118' r='14' fill='#16a34a'/>

                <rect x='18' y='192' width='150' height='150' rx='18' fill='#1d4ed8' stroke='#facc15' stroke-width='4'/>
                <rect x='40' y='214' width='106' height='106' rx='12' fill='#eff6ff' opacity='0.85'/>
                <circle cx='68' cy='242' r='14' fill='#2563eb'/>
                <circle cx='118' cy='242' r='14' fill='#2563eb'/>
                <circle cx='68' cy='292' r='14' fill='#2563eb'/>
                <circle cx='118' cy='292' r='14' fill='#2563eb'/>

                <rect x='192' y='192' width='150' height='150' rx='18' fill='#ca8a04' stroke='#fde047' stroke-width='4'/>
                <rect x='214' y='214' width='106' height='106' rx='12' fill='#fefce8' opacity='0.85'/>
                <circle cx='242' cy='242' r='14' fill='#eab308'/>
                <circle cx='292' cy='242' r='14' fill='#eab308'/>
                <circle cx='242' cy='292' r='14' fill='#eab308'/>
                <circle cx='292' cy='292' r='14' fill='#eab308'/>

                <polygon points='180,180 150,150 150,210' fill='#dc2626'/>
                <polygon points='180,180 150,150 210,150' fill='#16a34a'/>
                <polygon points='180,180 210,150 210,210' fill='#eab308'/>
                <polygon points='180,180 150,210 210,210' fill='#2563eb'/>
                <circle cx='180' cy='180' r='16' fill='#fef08a' stroke='#0f172a' stroke-width='3'/>
              </g>
            </svg>
          `)}")`,
          backgroundSize: '360px 360px',
          backgroundRepeat: 'repeat',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(6,17,36,0.22) 20%, rgba(4,9,20,0.82) 100%)',
        }}
      />
    </div>
  );
};
