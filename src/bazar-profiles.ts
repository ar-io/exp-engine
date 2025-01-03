import { dryrun } from "@permaweb/aoconnect";

export const AO = {
  ucm: "U3TjJAZWJjlWBB4KAXSHKzuky81jtyh0zqH8rUL4Wd0",
  ucmActivity: "SNDvAf2RF-jhPmRrGUcs_b1nKlzU6vamN9zl0e9Zi4c",
  profileRegistry: "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY",
};

export type TagType = { name: string; value: string };

export async function readHandler(args: {
  processId: string;
  action: string;
  tags?: TagType[];
  data?: any;
}): Promise<any> {
  const tags = [{ name: "Action", value: args.action }];
  if (args.tags) tags.push(...args.tags);
  let data = JSON.stringify(args.data || {});

  const response = await dryrun({
    // TODO: CHANGE TO CUSTOM CU
    process: args.processId,
    tags: tags,
    data: data,
  });

  if (response.Messages && response.Messages.length) {
    if (response.Messages[0].Data) {
      return JSON.parse(response.Messages[0].Data);
    } else {
      if (response.Messages[0].Tags) {
        return response.Messages[0].Tags.reduce((acc: any, item: any) => {
          acc[item.name] = item.value;
          return acc;
        }, {});
      }
    }
  }
}

export async function getProfilesByWalletAddresses(args: {
  addresses: string[];
}) {
  console.log("Running profile lookup...");
  const profileLookup = await readHandler({
    processId: AO.profileRegistry,
    action: "Read-Profiles",
    data: { Addresses: args.addresses },
  });

  if (profileLookup && profileLookup.length > 0) {
    console.log(`Profile found for ${args.addresses}`);
    return true;
  } else {
    console.log("No data found");
    return false;
  }
}
