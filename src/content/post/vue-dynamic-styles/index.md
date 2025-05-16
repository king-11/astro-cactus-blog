---
title: Dynamic Styles in VueJS
description: VueJS provides a straightforward way to create dynamic classes and styles
  using class and style bindings instead of plain strings.
canonicalUrl: https://king-11.hashnode.dev/dynamic-classes-and-styles
tags:
- vuejs
- tech
- frontend
publishDate: 2021-06-23
coverImage:
  src: dynamic-styles-vue.webp
  alt: Dynamic Styles in VueJS
---


In this article, I aim to provide a not so new but also not so known way of adding **dynamic features** into your application, ensuring that you can achieve what you wish to simply **without** writing *boilerplate code* and meddling with *string concatenation*.

When writing Dynamic UI Components that respond to user actions and events, we require methods to respond to these events by translating them into our DOM. Change in DOM is usually achieved by changing *styles* and *classes* based on certain **reactive data** that we have in our javascript. 

![old methods work but we can do better](https://cdn.hashnode.com/res/hashnode/image/upload/v1624430311612/E4UZ-uktt.png)

>While we can certainly do string concatenation, calculate a string and then bind a string to class or style... this method is error-prone and cumbersome at times to deal with. That's where Vue.js's clean suite of enhancements come into vue _( french for 'view' )_

## Quick Recap Data Binding

If you aren't familiar with what data binding is....it's essentially binding any attribute of an element in your `template` to the data available in your `script` tag, which can be props,  data or computed properties.

Data binding is one of the most elegant features of Vue.js because it provides reactive data binding with a straightforward syntax using `v-bind`.

```html
<div 
  v-bind:class="dynamicClass"
>Hello World!
</div>
```

A shorthand for data binding is but just using `:` and then the attribute name, which I guess anyone would prefer using more.

```html
<div 
  :class="dynamicClass"
>Hello World!
</div>
```

Let's suppose that the above class is not _a once initialized and stays the same_ kind of class it changes based on user input, so we have to use a `computed` property or `watch` to make changes to our `dynamicClass` variable. So things will start to look like this.

```js
export default {
  data( ) {
    return {
      changingBoolean: false
    }
  },
  computed: {
    dynamicClass: ( ) => changingBoolean : 'text-center text-lg' ? 'text-justify text-xl'
  }
}
```

>Looking at the code above we can see that for a simple switch in classes based on a variable we had to write so much code. So simply creating a dynamic class won't work.

![we don't do simple data binding](https://cdn.hashnode.com/res/hashnode/image/upload/v1624385259678/5by80HsTa.gif)

## Array Syntax for Classes

Enter array syntax which makes the previous task less cumbersome and also keeps it DRY at times when needed.

```html
<article 
  :class="[changingBoolean : ? 'text-center' : 'text-justify']"
>
    Hello World!
</aside>
```

This looks so much cleaner than the previous method right ≧◠‿◠≦✌. But it's an array so we can add multiple values into it too :). Now we can toggle the text alignment class while flex and width will always be present.

```html
<article 
  :class="[changingBoolean : ? 'text-center' : 'text-justify', 'flex w-2']"
>
    Hello World!
</aside>
```

## Object Syntax for Classes

Sometimes we just want to add toggle a single class on/off when a boolean is `true` and nothing when it's `false`. Using ternary operator it will look as below

 ```js
:class = [changingBoolean : ? 'text-center' : ' ', 'flex w-2']
```

We can do better, enter **object syntax** because eventually, everything is an object in javascript so why not.

![I object as in javascript everything is an object](https://media.giphy.com/media/gkEwPJyg6CxtVQ5rzK/giphy-downsized.gif)

 ```js
:class = [ { 'text-center' : changingBoolean }, 'flex w-2']
```

You can also bind an object directly to *class* instead of keeping it inside an array and it also supports multiple togglable classes just like an array.

```html
<article
  class="absolute"
  :class="{ active: isActive, 'text-xl': largeText }"
></article>
```

>`active` is a simple string variable for class whereas `isActive` and `largeText` are boolean variables. Also if you noticed *class* and *`:class`* can simultaneously exist on a single element ツ

### Passing in Objects

We can also pass in reactive `array/object` stored in our `data` or `computed` to classes. This can be a more powerful pattern at times when you have to do multiple checks and toggling which when accommodated into HTML won't look good and readable.

```html
<nav :class="classObject"></nav>
```

## Modifying Child Classes

Suppose we have a nice and shiny icon element we have specified several classes to it which works for most cases so we didn't bother making it a prop. But a time came when we had to change its colour in that case we want to pass down a new class to our child.

```html
<my-icon
  :class="text-blue-600"
/>
```

Now the `:class` will be appended at the end of the class inside of our component's parent. We can obviously also send in a simple `_class_` too.

## Array and Object Syntax for Styles

The array and object syntax for classes and style looks exactly identical except for a very minor change. It's not about the truthiness of variables anymore it's about assigning them to the right CSS property.

```html
<nav 
:style="{ marginTop: marginTop + 'px', backgroundColor: infoColor }"
>Doge Coin
</nav>
```

In the above example, we are assigning the `color` property a dynamic value and a similar operation for `fontSize`.

- We can write properties as kebab case too just ensure to wrap them in quotes
- It can be more powerful to directly pass in an object to `style` which is a more readable and cleaner method.

The purpose for array syntax in style reduces to allowing us to pass in multiple objects _( Duhhh that's what arrays do right :P )_ for style as passing a string to style works won't make much sense in the special syntax.

```html
<nav 
:style="[marginObject, backgroundObject]"
>Doge Coin
</nav>
```

## Bonus Treats 
![Bonus treats extra vue knowledge](https://media.giphy.com/media/ZAXpoT2WEYO3u/giphy.gif)

Some CSS properties require us to use vendor prefixes. Vue will apply them for us implicitly but if you want to be explicit you can pass in multiple values for a single property through object syntax and providing an array of values. Vue will only render the last value in the array which the browser supports.

```html
<ul :style="{ display: ['-webkit-box', '-ms-flexbox', 'flex'] }"></ul>
```

Thanks for reading! :). Please share your thoughts about the array and object syntax would you prefer them over strings?

Reach out to me on [Twitter](https://twitter.com/1108King) to share your feedback or for any queries. I'd be more than happy to help!
