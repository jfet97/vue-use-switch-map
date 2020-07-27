import Vue from 'vue'
import Composition from '@vue/composition-api'
import { ref, Ref, isRef, computed } from '@vue/composition-api'

Vue.use(Composition)

import { useSwitchMapO, SetCleanupFunction } from '../src'
import { timer } from './util'

const testObj = {
    p1: ref(0),
    p2: ref(''),
    p3: ref({
        p4: true,
    }),
    p5: 42,
}

const tOProjection = <T>(v: T, cleanup: SetCleanupFunction) => {
    return testObj
}

const threePropsProjectionInnerMutation = <T>(v: T, cleanup: SetCleanupFunction) => {
    const toRet = { number: ref(0), string: ref(''), boolean: true }

    const interval = setInterval(() => {
        console.log('setInterval')
        toRet.number.value++
        toRet.string.value += '!'
    }, 500)

    cleanup(() => {
        console.log('clearInterval')
        clearInterval(interval)
    })

    return toRet
}

describe('it should pass', () => {
    it('should pass', () => {
        expect(true).toBeTruthy()
    })
})

describe('useSwicthMapO', () => {
    it('should return the test obj', () => {
        const aRef = ref(0)
        const tO = useSwitchMapO(aRef, tOProjection)
        expect(tO).toStrictEqual(testObj)
    })

    it('should allow the projection to update the returned refs', async () => {
        const aRef = ref(0)
        const obj = useSwitchMapO(aRef, threePropsProjectionInnerMutation)

        expect(obj.number.value).toBe(0)
        expect(obj.string.value).toBe('')
        expect(obj.boolean).toBe(true)

        await timer(1100)

        expect(obj.number.value).toBe(2)
        expect(obj.string.value).toBe('!!')
        expect(obj.boolean).toBe(true)
    })

    it('should watch the input ref changes to than call again the projection, updating the refs', async () => {
        const aRef = ref(0)
        const obj = useSwitchMapO(aRef, threePropsProjectionInnerMutation)

        expect(obj.number.value).toBe(0)
        expect(obj.string.value).toBe('')
        expect(obj.boolean).toBe(true)

        await timer(1600)
        aRef.value++
        await timer(0)

        expect(obj.number.value).toBe(0)
        expect(obj.string.value).toBe('')
        expect(obj.boolean).toBe(true)
    })

    it(`should be uable to externally update the swicthMappedRef`, async () => {
        const aRef = ref(0)
        const obj = useSwitchMapO(aRef, threePropsProjectionInnerMutation)

        const cloneNumberRef = computed(() => obj.number.value)

        obj.number.value = 9
        await timer(0)
        expect(cloneNumberRef.value).toBe(9)
    })
})
