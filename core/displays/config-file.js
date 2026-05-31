import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
function livepraiseHome() {
    return path.join(process.env.LIVEPRAISE_HOME ?? os.homedir(), 'livepraise');
}
export function displaysConfigPath() {
    return path.join(livepraiseHome(), 'displays.json');
}
export function readDisplaysConfigFile() {
    const file = displaysConfigPath();
    if (!fs.existsSync(file))
        return null;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch {
        return null;
    }
}
export function writeDisplaysConfigFile(config) {
    const file = displaysConfigPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf8');
}
