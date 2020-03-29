/*
 * Copyright 2020 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by Maxime Allanic <maxime@allanic.me> at 25/03/2020
 */

const $serializer = require('../');
const $assert = require('chai').assert;

describe('Serializer', () => {
    it('should serialize simple object', async () => {
        var o = {
            o: true
        };
        var t = await $serializer.serialize(o);

        $assert.deepEqual(o, await $serializer.unserialize(t));
    });

    it('should serialize string', async () => {
        var o = 'test';
        var t = await $serializer.serialize(o);

        $assert.equal(o, await $serializer.unserialize(t));
    });

    it('should serialize complete class', async () => {
        class Test {
            constructor (r) {
                this.r = r;
            }
        }
        var o = new Test('ok');
        var t = await $serializer.serialize(o);
        var u = await $serializer.unserialize(t);

        $assert.deepEqual(o, u);
    });

    it('should serialize existing class', async () => {
        var o = new Error('ok');
        var t = await $serializer.serialize(o);
        var u = await $serializer.unserialize(t);

        $assert.ownInclude(o, u);
    });

    it('should serialize custom class', async () => {
        class Test {
            constructor (r) {
                this.r = r;
            }

            test() {

            }
        }

        var config = {
            constructors: {
                Test: {
                    serialize: async function (value, serializeObject) {

                        return {
                            type: 'object',
                            constructorName: 'Test',
                            value: await serializeObject(value)
                        };
                    },
                    unserialize: async function (object) {
                        return new Test(object.r)
                    }
                }
            }
        }

        var o = new Test('ok');
        var t = await $serializer.serialize(o, config);
        var u = await $serializer.unserialize(t, config);
        $assert.ok(u.constructor.name === 'Test');
        $assert.ownInclude(o, u);
    });

    it('should serialize function', async () => {
        var config = {
            constructors: {
                'Function': {
                    serialize: async function () {
                        var callerId = 'call:test';
                        var result = {
                            type: 'function',
                            constructorName: 'Function',
                            callerId: callerId
                        };
                        return result;
                    },
                    unserialize: async (unseralized, response, config, parentKey) => {
                        var f;
                        eval(`f = function ${ parentKey }() {return 'called';}`);
                        return f;
                    }
                }
            }
        }

        var o = {
            o: function () {

            }
        };
        var t = await $serializer.serialize(o, config);
        var u = await $serializer.unserialize(t, config);
        var result = u.o();
        $assert.ok(result === 'called');
//        $assert.ownInclude(o, u);
    })

    it('should call onCall when method is called', async () => {
        var o = function () {

        };
        var t = await $serializer.serialize(o);
        var u = await $serializer.unserialize(t, (key, ...args) => {
            $assert.equal(args[ 0 ], 'true');
        });

        u('true');
    });

    it('should call onCall when class method is called', async () => {
        class Test {
            constructor (r) {
                this.r = r;
            }

            test() {

            }
        }
        var o = new Test('ok');
        var t = await $serializer.serialize(o);

        var u = await $serializer.unserialize(t, {
            setPrototype: true,
            constructors: {
                'Function': {
                    unserialize: () => {
                        return function (...args) {
                            $assert.equal(args[ 0 ], 'true');
                            done();
                        }
                    }
                }
            }
        });

        u.test('true');
    });
});