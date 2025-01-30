import { useState, useRef, useEffect } from 'react';

export default function LandingPlate() {

    const plates = [0, 1, 2, 3, 4, 5].map(i => ({
        id: i,
        url: `https://raw.githubusercontent.com/JessieJessJe/nyc-conaming/main/src/images/plate${i}.png`
    }));

    const ratio = [0.1, 0.17, 0.2, 0.28, 0.22, 0.18];
    const offsetX = [0.5, 0.3, 0.1, 0.0, -0.25, -0.3];
    const offsetY = [-0.4, 0, 0, 0, 0.09, 0.08];

    const LandingPlates = () => {
        const [containerWidth, setContainerWidth] = useState(0);
        const containerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const observer = new ResizeObserver((entries) => {
                const [entry] = entries;
                if (entry) {
                    setContainerWidth(entry.contentRect.width);
                }
            });

            if (containerRef.current) {
                observer.observe(containerRef.current);
            }

            return () => observer.disconnect();
        }, []);

        return (
            <div className="relative w-full h-full" ref={containerRef}>
                <div className="flex flex-wrap justify-center items-center gap-1 md:gap-2 px-4">
                    {plates.map((plate, i) => (
                        <img
                            key={plate.id}
                            src={plate.url}
                            alt={`Street Sign ${plate.id}`}
                            style={{
                                width: `${ratio[i] * containerWidth * 0.7}px`,
                                transform: `translateX(${offsetX[i] * ratio[i] * containerWidth}px) translateY(${offsetY[i] * ratio[i] * containerWidth}px)`,

                            }}
                            className="h-auto transition-transform duration-300 hover:-translate-y-2"
                        />
                    ))}
                </div>
            </div>
        );
    };

    return <LandingPlates />;
}