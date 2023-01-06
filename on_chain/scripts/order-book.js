import { Program } from '@hyperionbt/helios';
import fs from 'fs';

const src = fs.readFileSync('./order-book.hl').toString();

const program = Program.new(src);

const simplify = false;

export const uplcProgram = program.compile(simplify);

console.log(uplcProgram.serialize());

//                    expected_value: Value = Value::new(orderDatum.to, orderDatum.minAmount);


/*

func main(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {
    datum.switch {
        orderDatum: Order => {
            datum_outputs: []TxOutput = ctx.tx.outputs_locked_by_datum(ctx.get_current_validator_hash(), orderDatum, true);
            redeemer.switch {
                Swap => {
                    expected_value: Value = Value::new(orderDatum.to, orderDatum.minAmount);
                    actual_value: Value = ctx.tx.value_sent_to_datum(orderDatum.owner, orderDatum, true);
                    ((actual_value >= expected_value) && (datum_outputs.length == 1))
                },
                Cancel => {
                    (ctx.tx.is_signed_by(orderDatum.owner) && (datum_outputs.length == 1))
                }
            }
        },
        Stake => false,
        else => false
    }
}
*/