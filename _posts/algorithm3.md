---
title: "Programmers 약수의 합"
date: 2020-11-23T21:17:49+09:00
draft: false
description: "Programmers 약수의 합"
tags: [algorithm]
categories: [algorithm]
---
정수 n을 입력받아 n의 약수를 모두 더한 값을 리턴하는 함수, solution을 완성해주세요.

제한 사항: n은 0 이상 3000이하인 정수입니다.

풀이
```
class Solution {

    public int solution(int n) {
      int answer = 0;
      for(int i = 1; i <= n/2; i++){
        if(n == 0){
          break;
        }
        int a = n % i;
        if(a == 0){
          answer += i;
        }
      }
      return answer + n;
    }
}
```

나머지연산을 이용해 풀었습니다.