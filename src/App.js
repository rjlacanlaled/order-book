import './App.css'
import { useEffect, useState } from 'react';
import { Lucid, Blockfrost, Constr, getAddressDetails, fromUnit, hexToUtf8, utf8ToHex, Data, datumToHash, tryToDoubleCborEncodedScript } from 'lucid-cardano';
import orderBookScriptJson from './order-book.json';

/* global BigInt */

const swapRedeemer = { "constructor": 0, "fields": [] };
const cancelRedeemer = { "constructor": 1, "fields": [] };
const adaToWmtDatum = { "constructor": 0, "fields": [{ "bytes": "1394514f26bc9bf88f3733eaf72a5e298d209a21afe8748c2b1298b6" }, { "constructor": 0, "fields": [{ "bytes": "" }, { "bytes": "" }] }, { "constructor": 0, "fields": [{ "bytes": "065270479316f1d92e00f7f9f095ebeaac9d009c878dc35ce36d3404" }, { "bytes": "574d5474" }] }, { "int": 5000 }] }
const wmtToAdaDatum = { "list": [{ "bytes": "1394514f26bc9bf88f3733eaf72a5e298d209a21afe8748c2b1298b6" }, { "constructor": 0, "fields": [{ "bytes": "065270479316f1d92e00f7f9f095ebeaac9d009c878dc35ce36d3404" }, { "bytes": "574d5474" }] }, { "constructor": 0, "fields": [{ "bytes": "" }, { "bytes": "" }] }, { "int": 100000000 }] }
const contractAddress = "addr_test1wzd20pk5dcdk9w7h0g8ynmhdske479umayec0u8uwpzplzch4gvdt";



const minLovelace = 2000000n;

const orderBookScript = {
  type: "PlutusV2",
  script: orderBookScriptJson.cborHex
}

const Datum = {
  owner: "",
  fromPolicy: "",
  fromAssetName: "",
  toPolicy: "",
  toAssetName: "",
  minReceived: 0
}

const Asset = {
  policy: "",
  assetName: "",
  assetNameHex: "",
  amount: 0n
}

const datumHashToDatum = async (datumHash) => {
  const res = await fetch(`https://cardano-preview.blockfrost.io/api/v0/scripts/datum/${datumHash}`, {
    method: 'GET',
    headers: {
      project_id: "previewsvCJrhJ5kAN2sUqbeY7okLvKcHftwoEu"
    }
  });

  return await res.json();
}

const datumToObject = (datum) => {
  console.log({ datum });


  const datumObj = {
    owner: datum[0].bytes,
    fromPolicy: datum[1].fields[0].bytes,
    fromAssetName: datum[1].fields[1].bytes,
    toPolicy: datum[2].fields[0].bytes,
    toAssetName: datum[2].fields[1].bytes,
    amount: datum[3].int
  }

  return datumObj;
}

const getAssetName = assetNameHex => {
  if (assetNameHex === '') {
    return "lovelace"
  } else {
    return hexToUtf8(assetNameHex);
  }
}

function App() {
  const [address, setAddress] = useState(null);

  const [api, setApi] = useState(null);
  const [lucid, setLucid] = useState(null);
  const [isScriptAttached, setIsScriptAttached] = useState(false);
  const [scriptUtxo, setScriptUtxo] = useState("");
  const [orders, setOrders] = useState([]);
  const [fromPolicy, setFromPolicy] = useState("lovelace");
  const [fromAssetName, setFromAssetName] = useState("lovelace");
  const [fromAssetNameHex, setFromAssetNameHex] = useState("lovelace");
  const [fromAmount, setFromAmount] = useState(0.0);
  const [toPolicy, setToPolicy] = useState("065270479316f1d92e00f7f9f095ebeaac9d009c878dc35ce36d3404");
  const [toAssetName, setToAssetName] = useState("GEROt");
  const [toAssetNameHex, setToAssetNameHex] = useState("4745524f74");
  const [toRate, setToRate] = useState(0.0);
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState("");
  const [minReceived, setMinReceived] = useState(0);
  const [order1, setOrder1] = useState(null);
  const [order2, setOrder2] = useState(null);

  const getDatum = (json) => {
    console.log({ json });
    const datum = Data.to(
      new Constr(0, [
        json.owner,
        new Constr(0, [json.fromPolicy, json.fromAssetName]),
        new Constr(0, [json.toPolicy, json.toAssetName]),
        json.minReceived ?? json.amount
      ])
    );

    return datum;
  }

  const getDatumTag = (json) => {
    const datum = Data.to(
      new Constr(1, [
        new Constr(0, [
          new Constr(0, [
            json.txId
          ]),
          json.txIndex
        ])
      ])
    );

    return datum;
  }

  const getRedeemer = index => {
    return Data.to(
      new Constr(index, [])
    )
  }


  const onConnectWallet = async () => {
    if (address !== null) {
      setAddress(null);
      setApi(null);
      setLucid(null);
      return;
    }
    setApi(await window.cardano.eternl.enable());
  }

  const onAttachScript = async () => {
    if (lucid === null) return;


  }

  const onOrderRefresh = async () => {
    const utxos = await lucid.provider.getUtxos(contractAddress);
    console.log(utxos);
    const utxosWithInlineDatum = utxos.filter(u => u.datum != null && u.scriptRef == null);
    console.log({ utxosWithInlineDatum });
    const pendingOrders = []
    for (const utxoWithInlineDatum of utxosWithInlineDatum) {
      const datumHash = lucid.utils.datumToHash(utxoWithInlineDatum.datum);
      const datum = await datumHashToDatum(datumHash);

      console.log({ datum });

      const datumObj = datumToObject(datum.json_value.fields);

      let value;
      for (const key in utxoWithInlineDatum.assets) {
        let asset = '';

        if (datumObj.fromPolicy === '') {
          asset = 'lovelace';
        } else {
          asset = datumObj.fromPolicy + datumObj.fromAssetName
        }

        console.log({ asset });
        if (key === asset) {
          value = utxoWithInlineDatum.assets[key];
          break;
        }
      }


      const pendingOrder = {
        datum: datumObj,
        value,
        rate: datumObj.amount / Number(value),
        utxo: utxoWithInlineDatum,
        originalDatum: datum.json_value
      }

      pendingOrders.push(pendingOrder);

      console.log({ pendingOrder });
    }

    setOrders(pendingOrders);
    console.log(utxos);

  }

  const onCreateOrder = async () => {

    if ((fromPolicy + fromAssetNameHex) === toPolicy + toAssetNameHex || fromAmount <= 0 || toRate <= 0 || isNaN(fromAmount) ||
      isNaN(toRate) || BigInt(fromAmount) > assets.filter(a => a.policy + a.assetNameHex === fromPolicy + fromAssetNameHex)[0].amount) {
      return alert("Invalid order");
    }

    let lovelaceAmount = 0n;
    let tokenAmount = 0n;
    if (fromAssetName !== "lovelace") {
      lovelaceAmount = minLovelace;
      tokenAmount = BigInt(Math.trunc(fromAmount));
    } else {
      lovelaceAmount = BigInt(Math.trunc(fromAmount));
    }

    console.log(lovelaceAmount);
    const addressDetails = getAddressDetails(address);

    console.log(addressDetails);

    const json = {
      owner: addressDetails.paymentCredential?.hash,
      fromPolicy: fromPolicy === 'lovelace' ? '' : fromPolicy,
      fromAssetName: fromAssetName === 'lovelace' ? '' : fromAssetNameHex,
      toPolicy: toPolicy === 'lovelace' ? '' : toPolicy,
      toAssetName: toPolicy === 'lovelace' ? '' : toAssetNameHex,
      minReceived: BigInt(Math.trunc(minReceived))
    }

    const datumHelios = getDatum(json);

    console.log(datumHelios);
    const utxos = await lucid.wallet.getUtxos();

    let tx;

    if (fromPolicy === 'lovelace') {
      tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datumHelios }, {
          lovelace: lovelaceAmount,
        })
        .complete()
    } else {
      tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datumHelios }, {
          lovelace: lovelaceAmount,
          [fromPolicy + fromAssetNameHex]: tokenAmount
        })
        .complete();
    }

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    console.log({ txHash });
  }

  const onRefreshAssets = async () => {
    const utxos = await lucid.wallet.getUtxos();
    let balances = [];
    console.log(utxos);
    for (const utxo of utxos) {
      for (const key in utxo.assets) {

        let index = balances.findIndex(b => key === "lovelace" ? "lovelace" : (b.policy + b.assetNameHex) === key);
        let policy = "lovelace";
        let assetName = "lovelace";
        let assetNameHex = "lovelace";
        let amount = utxo.assets[key];

        if (key !== "lovelace") {
          const assetDetails = fromUnit(key);
          policy = assetDetails.policyId;
          assetNameHex = assetDetails.assetName;
          assetName = hexToUtf8(assetNameHex);
        }

        if (index < 0) {
          balances.push({
            policy,
            assetName,
            assetNameHex,
            amount
          });
        } else {
          balances[index].amount += amount
        }
      }
    }
    console.log(balances);
    setAssets(balances);
  }

  const onFromAssetChange = async (e) => {
    const asset = assets.filter(a => a.policyId + a.assetNameHex === e.target.value)[0];
    setFromAssetName(asset.assetName);
    setFromPolicy(asset.policy);
    setFromAssetNameHex(asset.assetNameHex);
  }

  const onFromAmountChange = (e) => {
    console.log(assets);
    console.log(fromPolicy);
    console.log(fromAssetNameHex);
    const asset = assets.filter(a => a.policyId + a.assetNameHex === fromPolicy + fromAssetNameHex)[0];
    console.log("asset" + asset);

    setFromAmount(e.target.value);
  }

  const onToAssetNameChange = (e) => {
    setToAssetName(e.target.value);
    setToAssetNameHex(utf8ToHex(e.target.value));
  }

  const onToPolicyChange = (e) => {
    setToPolicy(e.target.value);
  }

  const onToRateChange = async (e) => {
    setToRate(e.target.value);
  }

  const onSelectOrder1 = (order) => {
    setOrder1(order);
  }

  const onSelectOrder2 = (order) => {
    setOrder2(order);
  }

  const onCancelOrder = async (order) => {

    const referenceScriptUtxo = (await lucid.utxosAt(contractAddress)).find(
      (utxo) => Boolean(utxo.scriptRef),
    );

    console.log({ referenceScriptUtxo });

    const addr = lucid.utils.credentialToAddress({ type: "Key", hash: order.datum.owner });

    console.log(referenceScriptUtxo[1]);
    const datum = getDatum(order.datum);

    const tx = await lucid
      .newTx()
      .readFrom([referenceScriptUtxo])
      .collectFrom([order.utxo], getRedeemer(1))
      .payToAddressWithData(addr, { inline: datum }, order.utxo.assets)
      .addSignerKey(order.datum.owner)
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    console.log(txHash);
  }

  const onSwap = async () => {
    console.log({ order1, order2 })

    const referenceScriptUtxo = (await lucid.utxosAt(contractAddress)).find(
      (utxo) => Boolean(utxo.scriptRef),
    );

    const order1Datum = getDatumTag({ txId: order1.utxo.txHash, txIndex: order1.utxo.outputIndex });
    const order2Datum = getDatumTag({ txId: order2.utxo.txHash, txIndex: order2.utxo.outputIndex });

    const order1lovelace = order1.datum.toPolicy === "" ? BigInt(order1.datum.amount) : minLovelace;
    const order2lovelace = order2.datum.toPolicy === "" ? BigInt(order2.datum.amount) : minLovelace;

    const order1asset = order1.datum.toPolicy !== "" ? BigInt(order1.datum.amount) : 0n;
    const order2asset = order2.datum.toPolicy !== "" ? BigInt(order2.datum.amount) : 0n;

    console.log(getAddressDetails(address));

    const order1Address = lucid.utils.credentialToAddress({ type: "Key", hash: order1.datum.owner });
    const order2Address = lucid.utils.credentialToAddress({ type: "Key", hash: order2.datum.owner });

    console.log({ order1Address, order2Address });


    let order1Assets = {
      lovelace: order1lovelace
    }

    let order2Assets = {
      lovelace: order2lovelace
    }


    if (order1.datum.toPolicy !== "") {
      order1Assets[`${order1.datum.toPolicy}${order1.datum.toAssetName}`] = order1asset
    }

    if (order2.datum.toPolicy !== "") {
      order2Assets[`${order2.datum.toPolicy}${order2.datum.toAssetName}`] = order2asset
    }

    console.log({ order1Datum, order2Datum });

    const extraUtxos = await lucid.wallet.getUtxos();

    console.log({ order1Assets });
    console.log({ order2Assets });
    console.log(getRedeemer(1));

    console.log({ referenceScriptUtxo });

    try {
      const tx = await lucid
        .newTx()
        .collectFrom([order1.utxo], getRedeemer(0))
        .readFrom([referenceScriptUtxo])
        .payToAddressWithData(order1Address, { inline: order1Datum }, order1Assets)
        .readFrom([referenceScriptUtxo])
        .collectFrom([order2.utxo], getRedeemer(0))
        .payToAddressWithData(order2Address, { inline: order2Datum }, order2Assets)
        .complete();

      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();
      console.log({ txHash });
    } catch (err) {
      console.log(err);
    }

  }

  useEffect(() => {
    if (address !== null) {
      setInterval(() => {
        onOrderRefresh();
        onRefreshAssets();
      }, 10000)
    }

  }, [address]);

  useEffect(() => {

    const setConfig = async () => {
      await onConnectWallet();
    }

    if (address === null) {
      setConfig()
    }
  }, [])

  useEffect(() => {
    if (api === null) return;
    const setupLucid = async () => {
      const lucidBlockfrost = await Lucid.new(new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", "previewsvCJrhJ5kAN2sUqbeY7okLvKcHftwoEu"), "Preview");
      lucidBlockfrost.selectWallet(api);

      setLucid(lucidBlockfrost);
      console.log("lucid set");
    };

    setupLucid();
  }, [api]);

  useEffect(() => {
    if (lucid === null) return;

    const getAddress = async () => {
      const addr = await lucid.wallet.address();
      setAddress(addr);
    }

    getAddress();

  }, [lucid]);

  useEffect(() => {
    console.log({
      fromAssetName,
      toAssetName,
      fromAmount,
      minReceived: minReceived
    });

    if ((fromPolicy + fromAssetNameHex) === toPolicy + toAssetNameHex || fromAmount <= 0 || toRate <= 0 || isNaN(fromAmount) || isNaN(toRate)) {
      setSummary("");
      return;
    }
    const minAmount = fromAmount * toRate;
    setMinReceived(minAmount);
    setSummary(`Minimum received: ${minAmount} ${toAssetName}`);


  }, [fromAssetName, toAssetName, fromAmount, toRate, toPolicy]);

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={onConnectWallet}>{address ?? "connect wallet"}</button>
        <button onClick={onAttachScript}>attach script</button>
      </header>
      <div className='OrderMain'>
        <div className='Trade'>
          <label> Trade </label>
          <button onClick={onRefreshAssets}>refresh assets</button>
          <div className='TradeInfo'>
            <label>From</label>
            <select id="assets" defaultValue="lovelace" onChange={onFromAssetChange}>
              {assets.map(a => {
                return <option key={a.policyId + a.assetNameHex} value={a.policyId + a.assetNameHex}>{`${a.assetName} -> ${a.amount}`}</option>
              })}
            </select>
            <input type="text" placeholder="enter amount" onChange={onFromAmountChange} />
          </div>
          <div className='TradeInfo'>
            <label>To</label>
            <input type="text" placeholder="enter policyId" defaultValue={toPolicy} onChange={onToPolicyChange} />
            <input type="text" placeholder="enter assetName" defaultValue={toAssetName} onChange={onToAssetNameChange} />
            <input type="text" placeholder="enter rate" defaultValue={0.0} onChange={onToRateChange} />
          </div>
          <div className='OrderSummary'>
            <label>order summary</label>
            <button onClick={onCreateOrder}>create order</button>
            <label>{summary}</label>
          </div>
        </div>
        <div className="Orders">
          <label> Orders </label>
          <button onClick={onOrderRefresh}>refresh</button>
          <ul>
            {orders.map(o => {
              return (
                <li key={o.datum.fromPolicy + o.datum.toPolicy + o.datum.owner + o.datum.amount}>
                  <label>{Number(o.value)} {getAssetName(o.datum.fromAssetName)} to {o.datum.amount} {getAssetName(o.datum.toAssetName)} rate: {o.rate}</label>
                  <button onClick={() => onSelectOrder1(o)}>order1</button>
                  <button onClick={() => onSelectOrder2(o)}>order2</button>
                  <button onClick={() => onCancelOrder(o)}>cancel</button>
                </li>)
            })}
          </ul>
        </div>
      </div>
      <br></br>
      <br></br>
      <br></br>
      <div className='SwapMain'>
        <label>Swap</label>
        <div>
          {order1 === null ? <label>select order 1</label> : <label>{Number(order1.value)} {getAssetName(order1.datum.fromAssetName)} to {order1.datum.amount} {getAssetName(order1.datum.toAssetName)} rate: {order1.rate}</label>}
        </div>
        <div>
          {order2 === null ? <label>select order 2</label> : <label>{Number(order2.value)} {getAssetName(order2.datum.fromAssetName)} to {order2.datum.amount} {getAssetName(order2.datum.toAssetName)} rate: {order2.rate}</label>}
        </div>
        <button onClick={onSwap}>swap</button>
      </div>
    </div >
  );
}

export default App;
