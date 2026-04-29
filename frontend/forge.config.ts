import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerWix } from '@electron-forge/maker-wix';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: "PeopleSearch",
    executableName: "PeopleSearch",
    icon: path.join(__dirname, 'public', 'hr-logo', 'favicon'),
    extraResource: [
      path.join(__dirname, '..', 'backend', 'dist', 'backend.exe'),
      path.join(__dirname, 'people.db')
    ]
  },
  rebuildConfig: {},
  makers: [
    new MakerWix({
      language: 1033,
      manufacturer: "PeopleSearch",
      description: "HR Data Management Application",
      ui: {
        chooseDirectory: true
      }
    }),
    new MakerZIP({}, ['win32']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
