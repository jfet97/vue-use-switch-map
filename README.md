# useswitchmap

```sh
npm i -S useswitchmap
```

A Vue 3 composition package that exports:

-   `useSwitchMap`, a function to compose a ref with a function from values to refs
-   `useSwitchMapO`, a function to compose a ref with a function from values to objects containing refs

It works with both Vue 3 and Vue 2 + @vue/composition-api because I'm using [vue-demi](https://github.com/antfu/vue-demi), and it is written in TypeScript.\
You can read more about this package in this [blog post](https://dev.to/jfet97/vue-3-refs-are-monads-4i27-temp-slug-6203971?preview=7b2d40cf956a3113ae1470082169faec440ad2f0b0cf16c30fd4116a95543ce194589b5b23db47c5cb3601a1c7180f78316a5eb2e1eaf2dcde3a739e).

Any contribution to enhance tests is really really appreciated 🙂.
&nbsp;

## useSwitchMap

```ts
function useSwitchMap<T, U>(
    ref: Ref<T>,
    projectionFromValuesToRefs: (value: T, scf: SetCleanupFunction) => Ref<U>
): Ref<U>
```

`useSwitchMap` takes a ref and a function from values to refs, returning a ref that will see its value changed because of two main reasons: the input function does change its returned ref's value, or the input ref's value has been changed.\
The first case is not special at all, I'm sure you already use some Vue 3 composition functions that internally listen to some events, or use some timeouts, promises, etc. and therefore change the ref's value they return in response to those happenings.\
The second case is more tricky, because lot fo stuff happens when the input ref's value (`Res<T>`) is changed. The `projectionFromValuesToRefs` function is re-runned from scratch, producing a new ref `R`. This ref is automagically substituted to the one that `useSwitchMap` has returned, in such a way that it will receive only the updates from the last ref `R` produced.

A function is passed to `projectionFromValuesToRefs` to let it set a cleanup function that will be called just before `projectionFromValuesToRefs` is runned again.

### example: mouse tracker

We want to track all the pointer positions after an initial click that starts the tracking. We want to be able to restart the tracking from scratch at each click.

Here it is:

```ts
import { useSwitchMap } from 'useswitchmap'
import { ref } from 'vue'

// click handling
const mouseClickPoisitonRef = ref({ x: -1, y: -1 })

function updateMouseCLickPositionRef(x, y) {
    mouseClickPoisitonRef.value.x = x
    mouseClickPoisitonRef.value.y = y
}

const clickListener = (clickEvent) => {
    updateMouseCLickPositionRef(clickEvent.screenX, clickEvent.screenY)
}

// each time we click, mouseClickPoisitonRef is updated
window.addEventListener('click', clickListener)

// positions tracking
const switchMappedRef = useSwitchMap(mouseClickPoisitonRef, (initP, cleanup) => {
    // do nothing until we click
    if (initP.x === -1) return ref([])

    const psRef = ref([{ x: initP.x, y: initP.y }])

    const moveListener = (moveEvent) => {
        psRef.value.push({
            x: moveEvent.screenX,
            y: moveEvent.screenY,
        })
    }

    // add the new position inside the positions array ref
    window.addEventListener('mousemove', moveListener)

    cleanup(() => window.removeEventListener('mousemove', moveListener))

    return psRef
})
```

Here `switchMappedRef` will be a ref to an array, initially empty, that will be updated with the pointer positions after the first click. Each time we click again, the function that tracks the mouse will be called again, so `switchMappedRef` will be updated with a new, fresh array. We do use the `cleanup` function to set a function that will remove the event listener because, even if older listeners do not interfere with `switchMappedRef`, we don't like memory leaks.
&nbsp;

## useSwitchMapO

A function like `useSwitchMap` is not enough for the case when the composed function returns an object where each property is itself a ref. This is why useSwitchMapO was born.

```ts
function useSwitchMapO<T, R extends object>(
    ref: Ref<T>,
    projectionFromValuesToRefs: (value: T, scf: SetCleanupFunction) => R
): R
```

### example: fetch

Our goal is to compose the following `useFetch` Vue composition function with a ref, so that each time the ref is changed the function will refetch the data. This `useFetch` function will return an object containing three refs: one that signal if the fetch is in a pending state, one for the resulting data and the last for a possible error message.

Using `useSwitchMapO` will be a breeze:

```js
import { useSwitchMapO } from 'useswitchmap'
import { ref, computed } from 'vue'

const useFetch = (url) => {
    const dataRef = ref(null)
    const errorMessageRef = ref('')
    const isPendingRef = ref(true)

    fetch(url)
        .then((response) => response.json())
        .then((data) => (dataRef.value = data))
        .catch((error) => (errorMessageRef.value = error.message))
        .finally(() => (isPendingRef.value = false))

    return { dataRef, errorMessageRef, isPendingRef }
}

// for example, counterRef could be a prop
const counterRef = ref(0)

function incrementCounterRef() {
    counterRef.value++
}

const urlRef = computed(() => `https://jsonplaceholder.typicode.com/todos/${counterRef.value}`)

// here it is
const { dataRef, errorMessageRef, isPendingRef } = useSwitchMapO(urlRef, useFetch)
```

As you can see, we have not to worry about older fetch calls that may take longer than the last one, with the risk of having our `dataRef`, `errorMessageRef` and `isPendingRef` changed by them.

Moreover, you can always use the cleanup function argument to set up a cleaup function, e.g. to stop an asynchronous computation:

```js
const useFetch = (url, cleanup) => {
    const dataRef = ref(null)
    const errorMessageRef = ref('')
    const isPendingRef = ref(true)

    const controller = new AbortController()
    const signal = controller.signal

    fetch(url, { signal })
        .then((response) => response.json())
        .then((data) => (dataRef.value = data))
        .catch((error) => (errorMessageRef.value = error.message))
        .finally(() => (isPendingRef.value = false))

    cleanup(() => controller.abort())

    return { dataRef, errorMessageRef, isPendingRef }
}
```

In this case, though, the promise will rejects with an `AbortError`, so the magic of `useSwitchMapO` is still needed to prevent the problems we have just discussed.

## Contribute

I've tried my best to test it, but I clearly suck at it. I've messed a lot with jest, fake timers and watchers without much success, therefore I was unable to express some advanced use cases that I had to personally test using home made solutions.
Therefore, any contribution in this direction is really really appreciated 😊.
