---
title: "백준 단계별로 풀어보기 - 재귀 (Python)"
date: 2022-08-08
description: "백준 단계별로 풀어보기 - 재귀 (Python)"
tags: [algorithm]
categories: [algorithm]
---

단계별로 풀어보기의 재귀 파트입니다.  
이 게시물은 제가 문제를 풀 때 마다 업데이트 할 예정입니다.  

## 팩토리얼 - 10872번
```python
import sys
x = int(sys.stdin.readline())

def factorial(n):
    if n == 0 or n == 1:
        return 1
    return  n * factorial(n - 1)

print(factorial(x))
```
## 피보나치 수 5 - 10870번
```python
import sys
x = int(sys.stdin.readline())

def fibonacci(n):
    if n <= 1:
        return n
    return  fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(x))
```
## 재귀함수가 뭔가요? - 17478번
```python
def recursive(m):
    print("_" * (4 * (n - m)) + '"재귀함수가 뭔가요?"')

    if not m:
        print("_" * (4 * (n - m)) + '"재귀함수는 자기 자신을 호출하는 함수라네"')
        print("_" * (4 * (n - m)) + "라고 답변하였지.")
        return

    print("_" * (4 * (n - m)) + '"잘 들어보게. 옛날옛날 한 산 꼭대기에 이세상 모든 지식을 통달한 선인이 있었어.')
    print("_" * (4 * (n - m)) + "마을 사람들은 모두 그 선인에게 수많은 질문을 했고, 모두 지혜롭게 대답해 주었지.")
    print("_" * (4 * (n - m)) + '그의 답은 대부분 옳았다고 하네. 그런데 어느 날, 그 선인에게 한 선비가 찾아와서 물었어."')
    recursive(m - 1)
    print("_" * (4 * (n - m)) + "라고 답변하였지.")


n = int(input())
print("어느 한 컴퓨터공학과 학생이 유명한 교수님을 찾아가 물었다.")
recursive(n)
```
## 별 찍기 - 10 - 2447번
```python
import sys
sys.setrecursionlimit(10**6)

def append_star(LEN):
    if LEN == 1:
        return ['*']

    Stars = append_star(LEN//3)
    L = []
    for S in Stars:
        L.append(S*3)
    for S in Stars:
        L.append(S+' '*(LEN//3)+S)
    for S in Stars:
        L.append(S*3)
    return L

n = int(sys.stdin.readline().strip())
print('\n'.join(append_star(n)))
```
## 하노이 탑 이동 순서 - 11729번
```python
import sys

def hanoi(n, start, end) :
    if n == 1 :
        print(start, end)
        return
       
    hanoi(n - 1, start, 6 - start - end)
    print(start, end)
    hanoi(n - 1, 6 - start - end, end)
    
n = int(sys.stdin.readline())
print(2 ** n - 1)
hanoi(n, 1, 3)
```
