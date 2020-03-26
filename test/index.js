/*
 * Copyright 2020 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by Maxime Allanic <maxime@allanic.me> at 25/03/2020
 */

const $serializer = require('../');
const $assert = require('chai').assert;

describe('Serializer', () => {
    it('should serialize simple object', () => {
        var o = {
            o: true
        };
        var t = $serializer.serialize(o);

        $assert.deepEqual(o, $serializer.unserialize(t));
    });

    it('should serialize string', () => {
        var o = 'test';
        var t = $serializer.serialize(o);

        $assert.equal(o, $serializer.unserialize(t));
    });

    it('should serialize complete class', () => {
        class Test {
            constructor (r) {
                this.r = r;
            }
        }
        var o = new Test('ok');
        var t = $serializer.serialize(o);
        var u = $serializer.unserialize(t);

        $assert.deepEqual(o, u);
    });

    it('should serialize existing class', () => {
        var o = new Error('ok');
        var t = $serializer.serialize(o);
        var u = $serializer.unserialize(t);

        $assert.ownInclude(o, u);
    });

    it('should call onCall when method is called', () => {
        var o = function () {

        };
        var t = $serializer.serialize(o);
        var u = $serializer.unserialize(t, (key, ...args) => {
            $assert.equal(args[ 0 ], 'true');
        });

        u('true');
    });

    it('should call onCall when class method is called', () => {
        class Test {
            constructor (r) {
                this.r = r;
            }

            test() {

            }
        }
        var o = new Test('ok');
        var t = $serializer.serialize(o);
        var u = $serializer.unserialize(t, (key, ...args) => {
            $assert.equal(args[ 0 ], 'true');
        });

        u.test('true');
    });
});