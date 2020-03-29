/*
 * Copyright 2020 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by Maxime Allanic <maxime@allanic.me> at 25/03/2020
 */

const defaultConstructors = {
    'File': {
        parse: async (value) => {
            return value;
        },
        format: async (value) => {
            return await value.arrayBuffer();
        }
    },
    'FileList': {
        parse: async (value) => {
            return value;
        },
        format: async (value) => {
            return Array.prototype.slice.call(value);
        }
    }
};

function findConstructor(object, constructors) {
    var key;
    if (constructors)
        key = Object.keys(constructors).find((key) => {
            return (!constructors[ key ].check && key === object.constructor.name)
                || (constructors[ key ].check && constructors[ key ].check(object));
        });

    if (key)
        return constructors[ key ];
    else {
        var key = Object.keys(defaultConstructors).find((key) => {
            return key === object.constructor.name && (!defaultConstructors[ key ].check || defaultConstructors[ key ].check(object));
        });
        return defaultConstructors[ key ];
    }
}

async function serializeObject(object, setPrototype, config, serialized) {
    var values = {};
    for (const key in object) {
        values[ key ] = await serialize(object[key], config, serialized);
    }

    await Promise.all(Object.getOwnPropertyNames(object).map(async (key) => {
        if (values.hasOwnProperty(key))
                return;
        values[ key ] = await serialize(object[ key ], config, serialized)
    }));

    if (!setPrototype)
        await Promise.all(Object.getOwnPropertyNames(Object.getPrototypeOf(object)).map(async (key) => {
            if (values.hasOwnProperty(key))
                return;
            values[ key ] = await serialize(object[ key ], config, serialized);
            values[ key ].prototype = true;
        }));
    return values;
}

async function serialize(object, config, serialized) {
    var values = {};

    // Manager circular reference
    if (!serialized) {
        if (typeof object === 'object')
            serialized = [
                object
            ];
        else
            serialized = [];
    }
    else if (typeof object === 'object' && serialized.includes(object))
        return {
            type: 'mirror'
        };
    else if (typeof object === 'object')
        serialized.push(object);

    // Manage nil values
    if (typeof object === 'undefined')
        return {
            type: 'undefined',
            value: undefined
        };
    else if (object === null)
        return {
            type: 'null',
            value: null
        };

    var constructor = findConstructor(object, config ? config.constructors : null);

    var constructorName = object.constructor.name;
    if (constructor)
        return await constructor.serialize(object, async (value, setPrototype) => {
            return serializeObject(value, setPrototype, config, serialized);
        });
    // Manage all other object values expect ArrayBuffer
    else if (typeof object === 'object' && object.constructor.name !== 'ArrayBuffer') {

        var isClassGlobal;
        eval(`isClassGlobal = typeof ${ constructorName } === 'function'`);
        values = await serializeObject(object, isClassGlobal, config, serialized);
    }
    // Or if is Number, Boolean just insert value
    else
        values = object;

    return {
        type: typeof object,
        constructorName: object.constructor.name,
        value: values
    };
};

async function unserializeObject(values, setPrototype, destination, config, parentKey) {
    for (const key in values) {
        if (setPrototype && values[ key ].prototype && values[ key ].type === 'function')
            destination.__proto__[ key ] = await unserialize(values[ key ], parentKey ? (parentKey + '.') : '' + key);
        else if (!values[ key ].prototype || (values[ key ].type !== 'function')) {
            destination[ key ] = await unserialize(values[ key ], config, parentKey ? (parentKey + '.') : '' + key);
        }
    }
}

async function unserialize(object, config, parentKey) {
    var value;
    if (!object)
        return null;

    if (config && config.constructors && config.constructors[ object.constructorName ]) {
        var unserializedValue = {};
        await unserializeObject(object.value, config.setPrototype, unserializedValue, config, parentKey);
        return await config.constructors[ object.constructorName ].unserialize(unserializedValue, object, config, parentKey);
    }
    else if (defaultConstructors[ object.constructorName ]) {
        var unserializedValue = {};
        await unserializeObject(object.value, config.setPrototype, unserializedValue, config, parentKey);
        return await config.defaultConstructors[ object.constructorName ].unserialize(unserializedValue, object, config, parentKey);
    }
    else if (object.type === 'object' && object.constructorName !== 'ArrayBuffer') {
        var isClassExist;
        eval(`isClassExist = typeof ${ object.constructorName } === 'function'`);

        if (isClassExist) {
            eval(`value = new ${ object.constructorName }()`);
            await unserializeObject(object.value, true, value, config, parentKey);
        }
        else {
            eval(`class ${ object.constructorName } {}; value = new ${ object.constructorName }`);
            await unserializeObject(object.value, true, value, config, parentKey);
        }
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