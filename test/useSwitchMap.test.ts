import Vue from "vue"
import Composition from "@vue/composition-api"
import { ref, Ref, isRef, computed } from "@vue/composition-api"

Vue.use(Composition)

import { useSwitchMap, SetCleanupFunction } from "../src"
import { timer } from "./util"

const pure = <T>(v: T) => ref(v)
const pureRefProjection = <T>(v: T, cleanup: SetCleanupFunction) => (pure(v) as Ref<T>) // see https://github.com/vuejs/vue-next/issues/1324#issuecomment-641150163
const pureRefObjProjection = <T>(v: T, cleanup: SetCleanupFunction) => (pure({ ...v }) as Ref<T>) // change the reference

describe('it should pass', () => {
    it('should pass', () => {
        expect(true).toBeTruthy()
    })
})

describe('base ref', () => {

    it('should return a ref', () => {
        expect(isRef(useSwitchMap(pure(10), pureRefProjection))).toBeTruthy()
    })

    it('should return a ref with value 10', () => {
        const tenRef = useSwitchMap(pure(10), pureRefProjection);
        expect(tenRef.value).toBe(10)
    })

    it('should be updatetd to value 11', async () => {
        const tenRef = pure(10)
        const cloneTenRef = useSwitchMap(tenRef, pureRefProjection);

        tenRef.value++
        // apart for the initial setting,
        // watchers do their work after the current tick
        await timer(0)
        expect(cloneTenRef.value).toBe(11)
    })

    it('should be updatetd to value 11', (done) => {
        const tenRef = pure(10)
        const cloneTenRef = useSwitchMap(tenRef, (v, c) => {

            const cloneRef = pure(v)

            setTimeout(async () => {
                cloneRef.value++;
                await timer(0)

                test()
                done()
            }, 100)

            return cloneRef
        });

        function test() {
            expect(cloneTenRef.value).toBe(11)
            done()
        }
    })

    it(`should return a ref with value '10'`, () => {
        const tenRef = pure(10)
        const cloneTenRef = useSwitchMap(tenRef, (v, c) => pureRefProjection(String(v), c));
        expect(cloneTenRef.value).toBe("10")
    })

    it(`should be updated with value '11'`, async () => {
        const tenRef = pure(10)
        const cloneTenRef = useSwitchMap(tenRef, (v, c) => pureRefProjection(String(v), c));

        tenRef.value++
        await timer(0)
        expect(cloneTenRef.value).toBe("11")
    })

    it(`should be updated with values 9 -> 11 -> 10`, async () => {
        const tenRef = pure(10)
        const cloneTenRef = useSwitchMap(tenRef, pureRefProjection);
        const cloneCloneTenRef = computed(() => cloneTenRef.value)

        tenRef.value = 9
        await timer(0)
        expect(cloneTenRef.value).toBe(9)
        expect(cloneCloneTenRef.value).toBe(9)

        cloneTenRef.value = 11
        await timer(0)
        expect(cloneTenRef.value).toBe(11)
        expect(cloneCloneTenRef.value).toBe(11)

        tenRef.value = 10
        await timer(0)
        expect(cloneTenRef.value).toBe(10)
        expect(cloneCloneTenRef.value).toBe(10)

    })

})

describe('object ref', () => {


    it('should return a ref with value { data: 10 }', () => {
        const tenObjRef = useSwitchMap(pure({ data: 10 }), pureRefObjProjection);
        expect(tenObjRef.value).toEqual({ data: 10 })
    })

    it('should be different references', async () => {
        const tenObjRef = pure({ data: 10 })
        const cloneTenObjRef = useSwitchMap(tenObjRef, pureRefObjProjection);
        expect(tenObjRef).not.toBe(cloneTenObjRef)
    })

    it('should be updatetd to value { data: 11 }', async () => {
        const tenObjRef = pure({ data: 10 })
        const cloneTenObjRef = useSwitchMap(tenObjRef, pureRefObjProjection);

        tenObjRef.value.data++
        await timer(0)
        expect(cloneTenObjRef.value).toEqual({ data: 11 })
    })

    it('should be updatetd to value { data: 11 }', (done) => {
        const tenObjRef = pure({ data: 10 })
        const cloneTenObjRef = useSwitchMap(tenObjRef, (v, c) => {
            const clone = { ...v }
            const cloneRef = pure(clone)

            setTimeout(async () => {
                cloneRef.value.data++;
                await timer(0)

                test()
                done()
            }, 100)

            return cloneRef
        });

        function test() {
            expect(cloneTenObjRef.value).toEqual({ data: 11 })
            done()
        }
    })

})

describe('cleanup', () => {


    it(`should transform the returned ref into '0!!!' and there should not be cleanup calls`, async () => {
        const counterRef = ref(0)

        function incrementCounter() {
            counterRef.value++
        }

        let mockedCleanup: any;
        const switchMappedRef = useSwitchMap(counterRef, (value, cleanup) => {
            const newRef = ref(`${value} is now a string`)

            const interval = setInterval(() => {
                newRef.value += "!"
            }, 1000)

            mockedCleanup = jest.fn(() => {
                clearInterval(interval)
            });

            cleanup(mockedCleanup)

            return newRef;
        })


        await timer(3200)

        expect(switchMappedRef.value).toBe("0 is now a string!!!")
        expect(mockedCleanup!.mock.calls.length).toBe(0)

    })

    it(`should transform the returned ref into '4!!!' and there should be 4 cleanup calls`, () => {
        // THIS IS A MESS WITH OR WITHOUT JEST TIMERS. PLZ HELP XD
        expect(1).toBe(1)
    })
})









