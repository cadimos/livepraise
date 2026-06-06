const path = require('node:path');

/**
 * Embute ícone e metadados no .exe sem winCodeSign (evita symlinks no Windows).
 * Requer signAndEditExecutable: false no electron-builder.yml.
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const { appInfo, projectDir } = context.packager;
  const exePath = path.join(context.appOutDir, `${appInfo.productFilename}.exe`);
  const iconPath = path.join(projectDir, 'resources', 'icon', 'livepraise.ico');

  const { rcedit } = await import('rcedit');
  await rcedit(exePath, {
    icon: iconPath,
    'product-version': appInfo.version,
    'file-version': appInfo.version,
    'version-string': {
      CompanyName: 'Cadimos',
      FileDescription: appInfo.productName,
      ProductName: appInfo.productName,
      InternalFilename: appInfo.name,
    },
  });

  console.log(`[afterPack] ícone embutido em ${exePath}`);
};
