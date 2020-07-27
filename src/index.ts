import { watch, customRef, Ref, isRef } from "vue-demi"

export type CleanupFunction = () => void
export type SetCleanupFunction = (cf: CleanupFunction) => void

// TODO: controlli runtime oggetti ref varie che nn si sa mais jiakké TS nn è obbligatorio
// astrai il possibile, grz E { [s: string]: Ref<T> } nn permette altri valori non Ref<T>, ma 
// Ref<T> | unknown === unknown :(

export function useSwitchMap<T>(
    ref: Ref<T>,
    projectionFromValuesToRefs: (value: T, scf: SetCleanupFunction) => Ref<T>
): Ref<T> {

    // cleanup function on ref.value update
    let localCleanup: CleanupFunction = () => { }
    const refreshCleanup = (cleanup: CleanupFunction) => {
        if (typeof cleanup !== "function") {
            localCleanup = () => { }
        } else {
            localCleanup = cleanup
        }
    }

    let dependenciesTrigger: () => void = () => { }

    let projectedRef: null | Ref<T> = null;

    let localValue: T | null = null

    // projectedRef must not register this function as dependency
    // it will have its own
    watch(ref, () => {
        // the projection may need the ability to cleanup some stuff
        localCleanup()
        projectedRef = projectionFromValuesToRefs(ref.value, refreshCleanup)

        // an update on ref.value will produce a new projectedRef
        // all the swicthMapRef dependencies should be notified
        // and the following watch will do it

        // delay to avoid dependencies collecting mess
        setTimeout(() => {
            // projectedRef is new, so we have to set a new effect for it
            watch(projectedRef!, () => {
                localValue = projectedRef!.value;

                // projectedRef.value has changed, we've got a new value
                // so we must notify our dependencies
                dependenciesTrigger()
            }, { immediate: true, deep: true }) // the ref could contain an object
        }, 0)
    }, { immediate: true, deep: true }) // the ref could contain an object

    return customRef((track, trigger) => {

        dependenciesTrigger = trigger

        return {
            get() {
                track()
                return localValue!
            },
            // not so much sense on changing this customRef value
            // because it's value strictly depends on ref.value and projectedRef.value updates
            // it will be overwritten as soon as ref.value / projectedRef.value changes
            set(value: T) {
                localValue = value
                dependenciesTrigger()
            }
        }

    })

}



export function useSwitchMapO<T, R extends { [s: string]: Ref<T> }>(
    ref: Ref<T>,
    projectionFromValuesToRefs: (value: T, scf: SetCleanupFunction) => R
): R {

    // cleanup function on ref.value update
    let localCleanup: CleanupFunction = () => { }
    const refreshCleanup = (cleanup: CleanupFunction) => {
        if (typeof cleanup !== "function") {
            localCleanup = () => { }
        } else {
            localCleanup = cleanup
        }
    }

    const dependenciesTriggers = new Map<keyof R, () => void>()

    let projectedRefO: null | R = null;

    const localValues = new Map<keyof R, T>()


    // projectedRefO must not register this function as dependency
    // it will have its own
    watch(ref, () => {
        // the projection may need the ability to cleanup some stuff
        localCleanup()
        projectedRefO = projectionFromValuesToRefs(ref.value, refreshCleanup)

        // an update on ref.value will produce a new projectedRef
        // all the swicthMapRefO dependencies should be notified
        // and the following watch will do it

        // delay to avoid dependencies collecting mess
        setTimeout(() => {
            // projectedRef is new, so we have to set a new effect for each of its props

            Object.entries(projectedRefO!).filter(([_,r]) => isRef(r)).forEach(([k, r]) => {

                watch(r, () => {
                    localValues.set(k, r.value)


                    // projectedRef.value has changed, we've got a new value
                    // so we must notify our dependencies
                    dependenciesTriggers.get(k)?.() // first time there is no trigger
                }, { immediate: true, deep: true }) // the ref could contain an object
            })

        }, 0)

    }, { immediate: true, deep: true }) // the ref could contain an object

    const refEntries = Object.entries(projectedRefO!).filter(([_,r]) => isRef(r)).map(([k, _]) => {

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
                }
            }
        })

        return [k, kRef]
    })

    const nonRefEntries = Object.entries(projectedRefO!).filter(([_, r]) => !isRef(r))

    console.log({ refEntries, nonRefEntries }, Object.fromEntries([...refEntries, ...nonRefEntries]))

    return Object.fromEntries([...refEntries, ...nonRefEntries])

}