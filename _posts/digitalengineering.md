---
title: 'Digitalengineering'
date: 2020-09-23T12:33:20+09:00
draft: false
description: 'Digitalengineering'
tags: [Digitalengineering]
categories: [Digitalengineering]
---

# Analog and digital

Analog: An analog signal is any continuous signal for which the time-varying feature (variable) of the signal is a representation of some other time-varying quantity, i.e., analogous to another time-varying signal.

Digital: A digital signal is a signal that is being used to represent data as a sequence of discrete values; at any given time it can only take on, at most, one of a finite number of values.

> A binary signal, also known as a logic signal, is a digital signal with two distinguishable levels

---

# Logic level

In digital circuits, a logic level is one of a finite number of states that a digital signal can inhabit. Logic levels are usually represented by the voltage difference between the signal and ground, although other standards exist. The range of voltage levels that represent each state depends on the logic family being used.

---

# Duty cycle

A duty cycle or power cycle is the fraction of one period in which a signal or system is active. Duty cycle is commonly expressed as a percentage or a ratio.

$$ hertz(Hz) = 1/T $$
$$Dutycycle = (PW/T)100(percent)$$
ex:
$$T = 10msec, PW=1msec $$
$$hertz = 1/10*10^{-3}sec=100Hz$$
$$D = 1msec/10*10^{-3}*100(percent)=10percent$$

---

# Code

Binay Coded Decimal  
express each decimals number to binary code  
Only 0~9 to binary ex) 35 -> 3|5 -> 00110101  
8421 code ex) 1|0000 -> 10

Plus ex)  
0010 + 0110 = 1000 -> 10  
1000 0000 + 0001 0010 = 1001 0010 -> 92  
1001 + 0010 = 1011 + 0110 = 0001 0001 -> 11  
0110 0111 + 0101 0011 = 1011 1010 + 0110 0110 = 0001 0010 0000 -> 120

Gray code  
When you change to the next code, only one bit changes.

1011(2) -> 1110  
xor: if each inputs same = 1, if each inputs not same = 0

11101 -> 10110(2)
Excess-3 code = BCD + 3  
doesn't use 0000, 0001, 0010, 1101, 1110, 1111

Plus ex)  
34 + 14 = 48 -> 0110 0111 + 0100 0111 = 1010 1110 -0011 -0011 = 0111 1011  
36 + 24 = 60 -> 0110 1001 + 0101 0111 = 1100 0000 -0011 +0000 = 1001 0011

---

# Error check code

Parity bit: It can check 1bit error, check the number of 1(an even numberm, odd number)

Cyclic redundancy check: It checks 1 ~ 2 bit error

Haming code: It can check error and edit  
2^(p-1) - p + 1 <= d <= 2^p - p - 1  
p = parity bit, d = the number of data bit

---

# [Logic gate](https://en.wikipedia.org/wiki/Logic_gate)

---

# [Boolean algebra](https://en.wikipedia.org/wiki/Boolean_algebra)

[Canonical normal form](https://en.wikipedia.org/wiki/Canonical_normal_form)

Sum of product  
It is method of adding multiplications  
ex) AB + AD  
Standard SOP's output is 1

Standard sum of product  
ex) X = A'B' + ABC, X = A'B'(C + C') + ABC, X = A'B'C + A'B'C' + ABC  
A'B'C, A'B'C', ABC is minterm

Product of sum  
It is method of multiplying additions
ex) (A + B)(A + C)  
Standard POS's output is 0

[Raws of Boolean algebra](https://www.electronics-tutorials.ws/boolean/bool_6.html)

---

# [Logic family](https://en.wikipedia.org/wiki/Logic_family)

[CMOS](https://en.wikipedia.org/wiki/CMOS)

---

# [Karnaugh map](https://en.wikipedia.org/wiki/Karnaugh_map)

---

# [Simplification of boolean functions](https://www.tutorialspoint.com/discrete_mathematics/simplification_of_boolean_functions.htm)

Integration of boolean functions  
1. Write a k-map corresponding to each output.
2. Integrate gates that can be shared.

[Universal gates](https://www.electronics-tutorials.ws/logic/universal-gates.html)

---

# [Combinational logic](https://en.wikipedia.org/wiki/Combinational_logic)

- [Adder (electronics)](https://en.wikipedia.org/wiki/Adder_(electronics))
- [Subtractor](https://en.wikipedia.org/wiki/Subtractor)
- [Comparator](https://en.wikipedia.org/wiki/Comparator)
- [Encoder](https://en.wikipedia.org/wiki/Encoder_(digital))
- [Binary decoder](https://en.wikipedia.org/wiki/Binary_decoder)