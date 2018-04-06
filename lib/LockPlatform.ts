import { AccessoryConfig } from './interfaces/AccessoryConfig';
import { Log } from './interfaces/Log';
import { Platform } from './interfaces/Platform';
import { Authenticator } from './Authenticator'
import { LockProperties } from './interfaces/LockProperties';
import { Accessory } from './interfaces/Accessory';
import { LockAccessory } from './LockAccessory';
import { Hap } from './HAP'

class LockPlatform {
  name: string;
  platform: Platform;
  log: Log;
  accessories: Array<Accessory>;
  registeredAccessories: Map<string, Accessory>;

  constructor(log: Log, config: AccessoryConfig, platform: Platform) {
    this.name = config['name'];
    this.log = log;
    this.platform = platform;
    this.accessories = [];
    this.registeredAccessories = new Map();

    if (this.platform) {
      this.platform.on('didFinishLaunching', () => {
        let email = config['email'];
        let password = config['password'];

        if (!email || !password) {
          throw Error('email and password fields are required in config');
        }

        let authenticator = new Authenticator(email, password, this.log);

        authenticator.authenticate().then((data) => {
          authenticator.getLocks(data.authorization).then((locks) => {
            locks.forEach((lock => {
              this.addAccessory(lock, data.authorization);
            }));
          })
        });
      });
    }
  }

  configureAccessory(accessory: Accessory): void {
    accessory.updateReachability(false);
    
    this.registeredAccessories.set(accessory.UUID, accessory);
  }

  addAccessory(properties: LockProperties, token: string): void {
    let uuid: string = Hap.UUIDGen.generate(properties.nickname);
    let accessory: Accessory;

    if (this.registeredAccessories.get(uuid)) {
      accessory = this.registeredAccessories.get(uuid);
    } else {
      accessory = new Hap.Accessory(properties.nickname, uuid);
    }

    let lockAccessory = new LockAccessory(accessory, properties, this.log, token);

    accessory.on('identify', (paired, callback) => {
      callback();
    });

    this.accessories.push(accessory);
    if (!this.registeredAccessories.get(uuid)) {
      this.platform.registerPlatformAccessories('homebridge-sesame', 'Sesame', [accessory]);
    }
  }
}

export { LockPlatform }
