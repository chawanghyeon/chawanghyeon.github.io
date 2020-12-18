---
title: 'Algorithm'
date: 2020-09-23
draft: true
description: 'Algorithm'
tags: [Algorithm]
categories: [Algorithm]
---

# Algorithm
What is algorithm? Algorithm is a finite sequence of well-defined, computer-implementable instructions, typically to solve a class of problems or to perform a computation.

## Feature of algorithm
1. Input and output
2. Finite nature
3. Accuracy
4. Generality

## Sequence of algorithms
1. Problem analysis
2. Data Collection
3. Decomposition
4. Pattern recognition
5. Abstract
6. Algorithm
7. Evaluation

## Performance time of algorithm
Measure based on the number of operations performed.

O(1) < O(logn) < O(n) < O(nlogn) < O(n^2) < O(n^3) < O(2^n)

## Euclidean algorithm
This is about an algorithm for the greatest common divisor.

1. a, b (but, a > b)
2. a / 2
3. if remainder = 0 the greatest common divisor is b, else b becomes a and remainder r becomes b
4. back to 2.

## Fibonacci numbers
f(n) = f(n-1)+f(n-2), f(0)=1, f(1)=1

## Recurrence ralation
A recurrence relation is an equation that recursively defines a sequence or multidimensional array of values, once one or more initial terms are given; each further term of the sequence or array is defined as a function of the preceding terms.

ex: A(n) = A(n-1)+2  
ex: merge sort
```java
merge(int arr[], int l, int mid, int r){
  int i = l;
  int j = mid + 1;
  int k = l;
  int temp[] = new int[arr.length];
  while(i<=mid && j<=r){
    if(arr[i] < arr[j]){
      temp[k++] = arr[i++];
    }else{
      temp[k++] = arr[j++];
    }
  }
  while(i<=mid){
    temp[k++] = arr[i++];
  }
  while(j<=r){
    temp[k++] = arr[j++];
  }
  for(int i=l; i<=r; i++){
    arr[i] = temp[i];
  }
}
```
Performance time :  T(n) = 2T(n/2) + overhead

## Asymptotic Analysis Method
1. Recurrent substitution method

   -Replace t(n) with t(n-1). Replace t(n-1) with t(n-2). Repeat until t(1)

   -ex) merge sort
   T(n) = 2T(n/2) + n, T(1) = 1  
   T(n) <= 2T(n/2) + n  
   <=2(2T(n/2^{2})+n/2) + n = 2^{2}T(n/2^{2})+2n  
   ...<=2^{k}T(n/2^{k})+kn, n = 2^{k}  
   =nT(1)+kn  
   =n+n log (n)  
   =O(n log n)

2. Substitution Method

   -To estimate the complexity by looking at the shape of the recurrence ralation formula and then inductive proof to obtain the time complexity

   -ex) merge sort

   -The complexity of T(n)=2T(n/2)+n is T(n) = O(n log n) That is, there is a positive constant c that satisfies T(n) ≤ cn log n for n large enough.
   Inductive assumption: T(n/2) ≤ c(n/2) log n/2
   T(n) = 2T(n/2) + n  
   ≤ 2c(n/2) log(n/2) + n  
   = cn log(n/2) + n  
   = cn log(n) − cn log2 + n  
   = cn log(n) + (−c log2 + 1)n  
   ≤ cn log (n)

3. Master Theorem

   -You can see the result right away from a certain shape of recursion.
   a >= 1, b >= 1  
   T(n) = aT(n/b) + f(n)  
   h(n) = n^{log(ba)}

   1. f(n)/h(n) = O(1/n^{ε}), T(n) = Θ(h(n))
   2. For positive constant ε,
      f(n)/h(n) = Ω(n^{ε})
      For constant c < 1 and enough large n,
      af(n/b) ≤ cf(n)  
      T(n) = Θ(f(n))
   3. f(n)/h(n) = Θ(1), T(n) = Θ(h(n) log n).

## Sorting
Internal sort: Sort information stored in memory
External sort: Sort information stored in Auxiliary memory

Considerations when selecting sorting algorithms

1. Distribution status of key values
2. Space required and working hours
3. Amount of data
4. Characteristics of computer system

- [Merge sort](https://en.wikipedia.org/wiki/Merge_sort)
- [Selection sort](https://en.wikipedia.org/wiki/Selection_sort)
- [Bubble sort](https://en.wikipedia.org/wiki/Bubble_sort)
- [Insertion sort](https://en.wikipedia.org/wiki/Insertion_sort)
- [Shellsort](https://en.wikipedia.org/wiki/Shellsort)
- [Quick sort](https://en.wikipedia.org/wiki/Quicksort)
- [Heap sort](https://en.wikipedia.org/wiki/Heapsort)
- [Radix sort](https://en.wikipedia.org/wiki/Radix_sort)
- [Counting sort](https://en.wikipedia.org/wiki/Counting_sort)
- [Introsort](https://en.wikipedia.org/wiki/Introsort)

## Search
It's a way to find data.

- Record  
A storage unit that contains all the information collected for an object.
- Field  
Each information in the record
- Key  
It's a representative field.
- Search Tree  
Each node has one key to match the rules.  
The key tells you where the record is stored.
- Linear Search  
It is a method of comparing and finding in order.
- Self-Organizing Sequential Search  
An improved version of sequential navigation as a method of placing frequently used data forward.
   - Move to front  
   Once a data searched, the data is sent to the very front.
   - Transpose
   Once a data searched, the data is sent to the right before.
   - Frequency count  
   Stores the number of times searched and organizes the data in the order in which the number of times searched is high.
- Binary Search  
It is a method of exploring sorted datasets by bifurcating them to two  
Time complexity: O(log n)  

## Tree
- [Binary Search Tree](https://en.wikipedia.org/wiki/Binary_search_tree)
- [Red-black tree](https://en.wikipedia.org/wiki/Red%E2%80%93black_tree)
- [B-tree](https://en.wikipedia.org/wiki/B-tree)

## [Hash table](https://en.wikipedia.org/wiki/Hash_table)

## [Dynamic programming](https://en.wikipedia.org/wiki/Dynamic_programming)
What is Dynamic programming?  
Dynamic programming is a way to solve complex problems by dividing them into small ones.

## [Divide and conquer algorithm](https://en.wikipedia.org/wiki/Divide-and-conquer_algorithm)
What is Divide and conquer algorithm?  
A divide-and-conquer algorithm works by recursively breaking down a problem into two or more sub-problems of the same or related type, until these become simple enough to be solved directly. The solutions to the sub-problems are then combined to give a solution to the original problem.

Common ground between Dynamic programming and Divide and conquer algorithm
- Solving complex problems by dividing them into small ones.

The difference between Dynamic programming and Divide and conquer algorithm
- Divide and conquer algorithm solves monopolistic problems
- Dynamic programming solves dependent problems

## [Tree traversal](https://en.wikipedia.org/wiki/Tree_traversal)

- [Depth first search](https://en.wikipedia.org/wiki/Depth-first_search)
- [Breadth first search](https://en.wikipedia.org/wiki/Breadth-first_search)
- [Spanning tree](https://en.wikipedia.org/wiki/Spanning_tree)
- [Prim's algorithm](https://en.wikipedia.org/wiki/Prim%27s_algorithm)
- [Kruskal's algorithm](https://en.wikipedia.org/wiki/Kruskal%27s_algorithm)

## [Topological sorting](https://en.wikipedia.org/wiki/Topological_sorting)

- [Dijkstra algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm)
- [Bellman-Ford algorithm](https://en.wikipedia.org/wiki/Bellman%E2%80%93Ford_algorithm)
- [Greedy algorithm](https://en.wikipedia.org/wiki/Greedy_algorithm)
