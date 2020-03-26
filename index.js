/*
 * Copyright 2020 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by Maxime Allanic <maxime@allanic.me> at 25/03/2020
 */

function serialize (object) {
    var values = {};

    if (typeof object === 'undefined') {
        return {
            type: 'undefined',
            value: undefined
        };
    }

    if (typeof object === 'object') {
        var isClassGlobal;
        eval(`isClassGlobal = typeof ${ object.constructor.name } === 'function'`);
        for (const key in object) {
            values[ key ] = serialize(object[key]);
        }

        Object.getOwnPropertyNames(object).forEach((key) => {

            values[ key ] = {
                type: typeof object[ key ],
                value: object[ key ]
            }
        });

        if (!isClassGlobal)
            Object.getOwnPropertyNames(Object.getPrototypeOf(object)).forEach((key) => {
                if (values.hasOwnProperty(key))
                    return;
                values[ key ] = {
                    type: typeof object[ key ],
                    prototype: true,
                    value: object[ key ]
                }
            });
    }
    else
        values = object;

    return {
        type: typeof object,
        constructor: object.constructor.name,
        value: values
    };
};

function unserialize(object, onMethodCall, parentKey) {
    var value;

    if (object.type === 'object') {
        var isClassExist;
        eval(`isClassExist = typeof ${ object.constructor } === 'function'`);

        if (isClassExist)
            eval(`value = new ${ object.constructor}()`);
        else
            eval(`class ${ object.constructor } {}; value = new ${ object.constructor }`);
        for (const key in object.value) {
            if (!isClassExist && object.value[key].prototype && object.value[key].type === 'function')
                value.__proto__[ key ] = unserialize(object.value[key], onMethodCall, parentKey ? (parentKey + '.') : '' + key);
            else if (!object.value[key].prototype || (object.value[key].type !== 'function'))
                value[ key ] = unserialize(object.value[key], onMethodCall, parentKey ? (parentKey + '.') : '' + key);
        }
    }
    else if (object.type === 'function') {
        return function (...args) {
            return onMethodCall(parentKey, ...args);
        };
    }
    else
        value = object.value;

    return value;
};

if (typeof module !== 'undefined') {
    module.exports = {
        serialize,
        unserialize
    };
}