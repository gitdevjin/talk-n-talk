import { IsUUID } from 'class-validator';

export class AddChatRoomMemberDto {
  @IsUUID('4', { each: true })
  memberIds: string[];
}
