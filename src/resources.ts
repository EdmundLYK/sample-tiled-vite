import { ImageFiltering, ImageSource, Loader, Resource } from "excalibur";
import { TiledResource } from '@excaliburjs/plugin-tiled';

// Import paths to work with Vite
// Note the ?url suffix
import heroPath from '../img/custom/office/hero-office-guy-v3.png?url';
import femaleHeroPath from '../img/custom/office female/hero-office-girl-v1.png?url';
import tilesetPath from '../img/Solaria Demo Pack Update 03/Solaria Demo Pack Update 03/16x16/Tilesets/Solaria Demo Update 01.png?url';
import purchaseTilesetPath from '../img/custom/office/tiles-grey.png?url';
import officeDeskWithPcPath from '../img/custom/office/desk-with-pc.png?url';
import officeDeskPath from '../img/custom/office/desk.png?url';
import officeChairPath from '../img/custom/office/chair.png?url';
import officePc1Path from '../img/custom/office/pc1.png?url';
import officePc2Path from '../img/custom/office/pc2.png?url';
import officePlantPath from '../img/custom/office/plant.png?url';
import officeTrashPath from '../img/custom/office/trash.png?url';
import officeCabinetPath from '../img/custom/office/cabinet.png?url';
import officeWaterCoolerPath from '../img/custom/office/water-cooler.png?url';
import officePrinterPath from '../img/custom/office/printer.png?url';
import officePartition1Path from '../img/custom/office/office-partitions-1.png?url';
import officePartition2Path from '../img/custom/office/office-partitions-2.png?url';
import officeCoffeeMakerPath from '../img/custom/office/coffee-maker.png?url';
import officeStampingTablePath from '../img/custom/office/stamping-table.png?url';
import officeLorryPath from '../img/custom/office/lorry.png?url';
import salesTmxPath from '../res/base-sales.tmx?url';
import purchaseTmxPath from '../res/base-purchase.tmx?url';
import operationsTmxPath from '../res/base-operations.tmx?url';
import tsxPath from '../res/tileset.tsx?url';
import purchaseTsxPath from '../res/tileset-purchase.tsx?url';

export const Resources = {
  HeroSpriteSheetPng: new ImageSource(heroPath, false, ImageFiltering.Pixel),
  HeroFemaleSpriteSheetPng: new ImageSource(femaleHeroPath, false, ImageFiltering.Pixel),
  OfficeDeskWithPcPng: new ImageSource(officeDeskWithPcPath, false, ImageFiltering.Pixel),
  OfficeDeskPng: new ImageSource(officeDeskPath, false, ImageFiltering.Pixel),
  OfficeChairPng: new ImageSource(officeChairPath, false, ImageFiltering.Pixel),
  OfficePc1Png: new ImageSource(officePc1Path, false, ImageFiltering.Pixel),
  OfficePc2Png: new ImageSource(officePc2Path, false, ImageFiltering.Pixel),
  OfficePlantPng: new ImageSource(officePlantPath, false, ImageFiltering.Pixel),
  OfficeTrashPng: new ImageSource(officeTrashPath, false, ImageFiltering.Pixel),
  OfficeCabinetPng: new ImageSource(officeCabinetPath, false, ImageFiltering.Pixel),
  OfficeWaterCoolerPng: new ImageSource(officeWaterCoolerPath, false, ImageFiltering.Pixel),
  OfficePrinterPng: new ImageSource(officePrinterPath, false, ImageFiltering.Pixel),
  OfficePartition1Png: new ImageSource(officePartition1Path, false, ImageFiltering.Pixel),
  OfficePartition2Png: new ImageSource(officePartition2Path, false, ImageFiltering.Pixel),
  OfficeCoffeeMakerPng: new ImageSource(officeCoffeeMakerPath, false, ImageFiltering.Pixel),
  OfficeStampingTablePng: new ImageSource(officeStampingTablePath, false, ImageFiltering.Pixel),
  OfficeLorryPng: new ImageSource(officeLorryPath, false, ImageFiltering.Pixel),
  TsxResource: new Resource(tsxPath, 'text'),
  PurchaseTsxResource: new Resource(purchaseTsxPath, 'text')
}

export const DepartmentBaseMapResources = {
  base_sales: new TiledResource(salesTmxPath, {
    pathMap: [
      { path: 'base-sales.tmx', output: salesTmxPath },
      { path: 'tileset-purchase.tsx', output: purchaseTsxPath },
      { path: 'tiles-grey.png', output: purchaseTilesetPath }
    ]
  }),
  base_purchase: new TiledResource(purchaseTmxPath, {
    pathMap: [
      { path: 'base-purchase.tmx', output: purchaseTmxPath },
      { path: 'tileset-purchase.tsx', output: purchaseTsxPath },
      { path: 'tiles-grey.png', output: purchaseTilesetPath }
    ]
  }),
  base_operations: new TiledResource(operationsTmxPath, {
    pathMap: [
      { path: 'base-operations.tmx', output: operationsTmxPath },
      { path: 'tileset-purchase.tsx', output: purchaseTsxPath },
      { path: 'tiles-grey.png', output: purchaseTilesetPath }
    ]
  })
} as const;

export const loader = new Loader();
loader.suppressPlayButton = true;
for (const resource of Object.values(Resources)) {
  loader.addResource(resource);
}
for (const resource of Object.values(DepartmentBaseMapResources)) {
  loader.addResource(resource);
}
