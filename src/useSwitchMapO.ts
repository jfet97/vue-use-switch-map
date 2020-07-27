import { watch, customRef, Ref, isRef } from 'vue-demi'

import { CleanupFunction, SetCleanupFunction } from './util'

export function useSwitchMapO<T, R extends object>(
    ref: Ref<T>,
    projectionFromValuesToRefs: (value: T, scf: SetCleanupFunction) => R
): R {
    // cleanup function on ref.value update
    let localCleanup: CleanupFunction = () => {}
    const refreshCleanup = (cleanup: CleanupFunction) => {
        if (typeof cleanup !== 'function') {
            localCleanup = () => {}
        } else {
            localCleanup = cleanup
        }
    }

    const dependenciesTriggers = new Map<string, () => void>()

    let projectedRefO: null | R = null

    const localValues = new Map<string, T>()

    // projectedRefO must not register this function as dependency
    // it will have its own
    watch(
        ref,
        () => {
            // the projection may need the ability to cleanup some stuff
            localCleanup()
            projectedRefO = projectionFromValuesToRefs(ref.value, refreshCleanup)

            // an update on ref.value will produce a new projectedRef
            // all the swicthMapRefO dependencies should be notified
            // and the following watch will do it

            // projectedRef is new, so we have to set a new effect for each of its props

            Object.entries(projectedRefO!)
                .filter(([, r]) => isRef(r))
                .forEach(([k, r]) => {
                    watch(
                        r,
                        () => {
                            localValues.set(k, r.value)

                            // projectedRef.value has changed, we've got a new value
                            // so we must notify our dependencies
                            dependenciesTriggers.get(k)?.() // first time there is no trigger
                        },
                        { immediate: true, deep: true }
                    ) // the ref could contain an object
                })
        },
        { immediate: true, deep: true }
    ) // the ref could contain an object

    const refEntries = Object.entries(projectedRefO!)
        .filter(([, r]) => isRef(r))
        .map(([k]) => {
            const kRef = customRef((track, trigger) => {
                dependenciesTriggers.set(k, trigger)

                return {
                    get() {
                        track()
                        return localValues.get(k)!
                    },

                    // not so much sense on changing this customRef value
                    // because it's value strictly depends on ref.value and projectedRefO[k] updates
                    // it will be overwritten as soon as ref.value / projectedRefO[k] changes
                    set(value: T) {
                        localValues.set(k, value)!
                        trigger()
                    },
                }
            })

            return [k, kRef]
        })

    const nonRefEntries = Object.entries(projectedRefO!).filter(([, r]) => !isRef(r))

    return Object.fromEntries([...refEntries, ...nonRefEntries])
}
