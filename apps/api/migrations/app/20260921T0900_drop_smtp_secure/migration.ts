#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/42054e8c4b0f71517a63230f595080753f3aae773134d3f454999ecac182f27c/contract';
import endContract from '../../snapshots/42054e8c4b0f71517a63230f595080753f3aae773134d3f454999ecac182f27c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/bab6f663880e08dab741ed66896c068a5a0d271d69343750365f5add85cc1c79/contract';
import startContract from '../../snapshots/bab6f663880e08dab741ed66896c068a5a0d271d69343750365f5add85cc1c79/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({
        schema: 'public',
        table: 'EmailSetting',
        column: 'smtpSecure',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
