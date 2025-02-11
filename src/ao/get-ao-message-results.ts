import { result } from "@permaweb/aoconnect";

async function main() {
  let { Messages, Spawns, Output, Error } = await result({
    message: "y19ZhKXwI3WER-1H-U_QIQYbQEPrHkhAAP72hCedlIk", // The ID of the message
    process: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc", // AO Token Process ID
  });

  console.log("\nMessages Found:");
  Messages.forEach((msg, index) => {
    console.log(`\nMessage ${index + 1}:`);
    console.log(`  Data: ${msg.Data}`);
    console.log(`  Target: ${msg.Target}`);
    console.log(`  Anchor: ${msg.Anchor}`);

    // Print tags properly
    console.log("  Tags:");
    msg.Tags.forEach((tag: { name: string; value: string }) => {
      console.log(`    ${tag.name}: ${tag.value}`);
    });
  });

  console.log("\nProcesses Spawned:");
  if (Spawns.length === 0) {
    console.log("  None");
  } else {
    console.log(JSON.stringify(Spawns, null, 2));
  }

  console.log("\nOutput:");
  console.log(JSON.stringify(Output, null, 2));

  if (Error) {
    console.log("\nErrors:");
    console.log(JSON.stringify(Error, null, 2));
  } else {
    console.log("\nNo errors encountered.");
  }
}

main();
