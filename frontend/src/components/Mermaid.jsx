import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

const Mermaid = forwardRef(({ chart }, ref) => {
    const mermaidRef = useRef(null);
    const [svg, setSvg] = useState('');
    const [error, setError] = useState(null);

    useImperativeHandle(ref, () => ({
        downloadImage: () => {
            const svgElement = mermaidRef.current.querySelector('svg');
            if (!svgElement) return;

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            const bbox = svgElement.getBBox();
            const width = svgElement.width.baseVal.value || bbox.width;
            const height = svgElement.height.baseVal.value || bbox.height;

            const scale = 2;
            canvas.width = width * scale;
            canvas.height = height * scale;

            img.onload = () => {
                ctx.fillStyle = '#001e3c';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                try {
                    const pngUrl = canvas.toDataURL('image/png');
                    const downloadLink = document.createElement('a');
                    downloadLink.href = pngUrl;
                    downloadLink.download = 'mindmap.png';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                } catch (e) {
                    console.error('Download failed:', e);
                }
            };

            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            img.src = url;

            img.onabort = () => URL.revokeObjectURL(url);
            img.onerror = () => URL.revokeObjectURL(url);
        }
    }));

    useEffect(() => {
        if (window.mermaid) {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                securityLevel: 'loose',
                fontFamily: 'Outfit, Inter, sans-serif',
                mindmap: {
                    useMaxWidth: true,
                }
            });
        }
    }, []);

    useEffect(() => {
        const renderChart = async () => {
            if (chart && window.mermaid) {
                try {
                    setError(null);
                    const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
                    const { svg: renderedSvg } = await window.mermaid.render(id, chart);
                    setSvg(renderedSvg);
                } catch (err) {
                    console.error('Mermaid render error:', err);
                    setError('Failed to render mind map. The syntax might be invalid.');
                }
            }
        };
        renderChart();
    }, [chart]);

    if (error) {
        return (
            <div className="mermaid-error" style={{ color: '#ff80ab', padding: '1rem', background: 'rgba(255, 64, 129, 0.1)', borderRadius: '8px' }}>
                <p>{error}</p>
                <pre style={{ fontSize: '0.8rem', overflow: 'auto', marginTop: '1rem' }}>{chart}</pre>
            </div>
        );
    }

    return (
        <div className="mermaid-outer-wrapper" style={{ position: 'relative', width: '100%' }}>
            <div
                ref={mermaidRef}
                className="mermaid-render-container"
                dangerouslySetInnerHTML={{ __html: svg }}
                style={{
                    width: '100%',
                    overflow: 'visible',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    padding: '1rem'
                }}
            />
        </div>
    );
});

export default Mermaid;
