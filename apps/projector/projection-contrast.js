/** Scrim + detecção de luminância para projeção (CAD-136 B6). */
function sampleImageLuminance(img) {
    if (img.hidden || !img.complete || !img.naturalWidth)
        return null;
    try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return null;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        return sum / (data.length / 4);
    }
    catch {
        return null;
    }
}
function sampleVideoLuminance(video) {
    if (video.hidden || video.readyState < 2 || !video.videoWidth)
        return null;
    try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return null;
        ctx.drawImage(video, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        return sum / (data.length / 4);
    }
    catch {
        return null;
    }
}
function resolveBgTone(targets) {
    const fromVideo = sampleVideoLuminance(targets.video);
    if (fromVideo !== null)
        return fromVideo > 0.55 ? 'light' : 'dark';
    const fromImage = sampleImageLuminance(targets.bgImage);
    if (fromImage !== null)
        return fromImage > 0.55 ? 'light' : 'dark';
    return 'dark';
}
export function syncProjectionContentState(stage, content) {
    const hasContent = content.textContent?.trim() || content.innerHTML.trim();
    stage.dataset.hasContent = hasContent ? 'true' : 'false';
}
export function attachProjectionContrast(targets) {
    const update = () => {
        const tone = resolveBgTone(targets);
        targets.stage.dataset.bgTone = tone;
        targets.content.dataset.bgTone = tone;
        syncProjectionContentState(targets.stage, targets.content);
    };
    targets.bgImage.addEventListener('load', update);
    targets.video.addEventListener('loadeddata', update);
    targets.video.addEventListener('play', update);
    update();
}
