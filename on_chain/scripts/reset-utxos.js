import { Blockfrost, Lucid } from 'lucid-cardano';



const address = "addr_test1vqfeg520y67fh7y0xue74ae2tc5c6gy6yxh7sayv9vff3ds5m7hk8";
const blockfrostUtxos = await fetchUtxos(address);

const lucid = await Lucid.new(new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", "previewsvCJrhJ5kAN2sUqbeY7okLvKcHftwoEu"), "Preview");

