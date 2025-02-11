async function queryForMessageId(msgId: String): Promise<any> {
    const query = {
      query: `query {
            transactions(
              ids: ["${msgId}"]
            ) {
              edges {
                cursor
                node {
                    id
                    bundledIn { id }
                    owner { address }
                    fee { ar }
                    quantity { ar }
                    tags { name value }
                    data { size }
                    block { height timestamp }
                }
              }
            }
          }`,
    };
    try {
        const response = await fetch("https://arweave.net/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
        });
    
        const data: any = await response.json();
    
        if (!data?.data?.transactions?.edges?.length) {
          console.log("No transaction found for given ID.");
          return {};
        }
    
        const transaction = data.data.transactions.edges[0];
        const { id, bundledIn, owner, fee, quantity, tags, data: txData, block } = transaction.node;
    
        console.log("\nTransaction Details:");
        console.log(`ID: ${id}`);
        console.log(`Bundled In: ${bundledIn?.id || "N/A"}`);
        console.log(`Owner: ${owner.address}`);
        console.log(`Fee: ${fee.ar} AR`);
        console.log(`Quantity: ${quantity.ar} AR`);
        console.log(`Data Size: ${txData.size}`);
        console.log(`Block Height: ${block.height}`);
        console.log(`Timestamp: ${block.timestamp}`);
    
        console.log("\nTags:");
        tags.forEach((tag: { name: string; value: string }) => {
          console.log(`  ${tag.name}: ${tag.value}`);
        });
    
        return transaction;
    } catch (error) {
        console.error("Error fetching transaction details:", error);
        return {};
    }
}
    
    // Example: Fetch transaction details for a given AO Message ID or Arweave transaction ID
    const msgId = "y19ZhKXwI3WER-1H-U_QIQYbQEPrHkhAAP72hCedlIk";
    queryForMessageId(msgId);