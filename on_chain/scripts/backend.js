import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import * as helios from '@hyperionbt/helios';
import fetch from "node-fetch";

const blockfrostApi = new BlockFrostAPI({
    projectId: "previewsvCJrhJ5kAN2sUqbeY7okLvKcHftwoEu"
});

export const fetchUtxos = async (addr) => {
    return await blockfrostApi.addressesUtxosAll(addr);
}

export const getHeliosUtxos = async (blockfrostUtxos) => {
    const heliosUtxos = [];
    for (const blockfrostUtxo of blockfrostUtxos) {

        let value = new helios.Value();

        for (const amount of blockfrostUtxo.amount) {
            if (amount.unit === 'lovelace') {
                value.setLovelace(BigInt(amount.quantity));
            } else {
                const asset = await blockfrostApi.assetsById(amount.unit);
                value.assets.addTokens(helios.MintingPolicyHash.fromHex(asset.policy_id), [Buffer.from(asset.asset_name, 'hex'), BigInt(amount.quantity)]);
            }
        }

        const heliosUtxo = new helios.UTxO(
            helios.TxId.fromHex(blockfrostUtxo.tx_hash),
            BigInt(blockfrostUtxo.output_index),
            new helios.TxOutput(helios.Address.fromBech32(blockfrostUtxo.address), value)
        );

        heliosUtxos.push(heliosUtxo);
    }

    return heliosUtxos;
}

export const getNetworkParams = async () => {
    return new helios.NetworkParams(
        await fetch("https://d1t0d7c2nekuk0.cloudfront.net/preview.json")
            .then(response => response.json())
    )
}