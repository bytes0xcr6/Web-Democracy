# a,b,c son los token staked de los jueces A,B,C respectivamente
# x,y,z son los honesty score de los jueces A,B,C respectivamente

# Getters and Setters for the Blockchain:
#
# activeJury[] (Getter) + (Setter)
# tokensStaked[] (Getter)
# honestyScore[] (Getter)
# Jurror = tokens staked + HonestyScore (Algorithm probabilidad)
# JuryScore[] (Setter) 
# Select juror en base a la cantidad (Algorithm aleatoriedad)


def jury_selection(tokenStaked,honestyScore):

    total_staked=0                # Total de tokens stakeados 
    total_honesty=0               # Total de puntos de honestidad
    sumation1=0                   # Contador donde sumaremos los tickets finales
    sumation2=0
    sumation3=0
    probability_token_staked=[]   # Probabilidad basada en los tokens stakeados
    probablity_honesty_score=[]   # Probabilidad basada en los puntos de honestidad
    final_tickets=[]              # Lista de la probabilidad final de ser seleccionado
    final_array=[]                # Lista FINAL con las probabilidades sumadas


    # Total de honesty score. Si hay alguna honesty score negativa la ignoramos
    # Cuando empecemos en una categoria total_honesty valdra 1 en vez de 0, 
		# para que el programa no de error
    for i in range(len(honestyScore)):
        if honestyScore[i]>=0:
            total_honesty+=honestyScore[i]
    
    if total_honesty==0:
        total_honesty=1   

    # Total de tokens stakeados
    for i in range(len(tokenStaked)):
            total_staked+=tokenStaked[i]
    
    # Probabilidad segun los tokens stakeados
    for i in range(len(tokenStaked)):
            probability_token_staked.append((tokenStaked[i]*5000)//total_staked)
    
    # Probabilidad segun los honesty score. Si es negativo, 
		# la probabilidad sera 0
    for i in range(len(honestyScore)):
        if honestyScore[i]<0:
            probablity_honesty_score.append(0)
        else:    
            probablity_honesty_score.append((honestyScore[i]*5000)//total_honesty)

    # Lista con la suma de las dos probabilidades
    for i in range(len(tokenStaked)):
       final_tickets.append(probability_token_staked[i]+probablity_honesty_score[i])
    
    # Sumamos el total de honesty score. Cuando empiece una categoria de inicio, 
		# este sumatorio dara 0
    for i in range(len(probablity_honesty_score)):
        sumation1+=probablity_honesty_score[i]

    # Listas finales donde las probabilidades se van sumando unas a otras

    # Si iniciamos una categoria de inicio, entonces sumation1=0, y por consiguiente
		# solo tendremos en cuenta la probability_token_staked, que tendremos que hacer
    # que valga el doble
    if sumation1==0:
        for i in range(len(final_tickets)):
            sumation2+=2*final_tickets[i]
            final_array.append(sumation2)  
    else:
        for i in range(len(final_tickets)):
            sumation3+=final_tickets[i]
            final_array.append(sumation3)
    
    return final_array
