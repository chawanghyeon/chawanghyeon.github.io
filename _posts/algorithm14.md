---
title: "Programmers 정수 제곱근 판별"
date: 2020-11-23T22:56:23+09:00
draft: false
description: "Programmers 정수 제곱근 판별"
tags: [algorithm]
categories: [algorithm]
---
임의의 양의 정수 n에 대해, n이 어떤 양의 정수 x의 제곱인지 아닌지 판단하려 합니다.
n이 양의 정수 x의 제곱이라면 x+1의 제곱을 리턴하고, n이 양의 정수 x의 제곱이 아니라면 -1을 리턴하는 함수를 완성하세요.

제한 사항
- n은 1이상, 50000000000000 이하인 양의 정수입니다.

풀이
```
class Solution {

  public long solution(long n) {
    long answer = 0;
    if(n == 1){
      return 4;
    }
    for(long i = 1; i < n; i++){
      if(n / i == i){
        if(n % i == 0){
          return (i + 1) * (i + 1);
        }
      }
    }
    return -1;
  }

}
```